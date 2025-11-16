import requests
import json
import boto3
import uuid
import os
import traceback

dynamodb = boto3.resource("dynamodb")
incidents_table = dynamodb.Table("Incidents")
connections_table = dynamodb.Table("Connections")

AIRFLOW_API_URL = "http://<airflow-instance-url>/api/v1/dags/your_dag_id/dagRuns"

def send_ws_message(message):
    """Envia mensaje a todos los WebSockets conectados"""
    api = boto3.client(
        "apigatewaymanagementapi",
        endpoint_url=os.environ["WS_URL"]
    )

    # Obtener todas las conexiones activas
    result = connections_table.scan()
    connections = result.get("Items", [])

    for conn in connections:
        try:
            api.post_to_connection(
                ConnectionId=conn["connectionId"],
                Data=json.dumps(message).encode("utf-8")
            )
        except Exception as e:
            print(f"Conexión caída {conn['connectionId']}, eliminando...")
            connections_table.delete_item(Key={"connectionId": conn["connectionId"]})

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        required = ["tipo_incidente", "nivel_urgencia", "ubicacion", "tipo_usuario", "descripcion"]

        missing = [x for x in required if x not in body]
        if missing:
            return {"statusCode": 400, "body": f"Faltan campos: {missing}"}

        uuidv4 = str(uuid.uuid4())
        tenant_id = body.get("tenant_id", "utec")

        incidente = {
            "uuid": uuidv4,
            "tenant_id": tenant_id,
            "tipo_incidente": body["tipo_incidente"],
            "nivel_urgencia": body["nivel_urgencia"],
            "ubicacion": body["ubicacion"],
            "tipo_usuario": body["tipo_usuario"],
            "descripcion": body["descripcion"],
            "estado": "pendiente"
        }

        # Guardar en DynamoDB
        incidents_table.put_item(Item=incidente)

        # Llamar Airflow
        airflow_payload = {"conf": {"uuid": uuidv4, "descripcion": body["descripcion"]}}
        airflow_res = requests.post(AIRFLOW_API_URL, json=airflow_payload)

        if airflow_res.status_code not in [200, 201]:
            raise Exception(f"Airflow error: {airflow_res.text}")

        # Notificar por WebSocket a todos los administradores
        send_ws_message({
            "type": "newIncident",
            "incident": incidente
        })

        return {"statusCode": 200, "body": json.dumps({"mensaje": "Reporte creado", "uuid": uuidv4})}

    except Exception as e:
        traceback.print_exc()
        return {"statusCode": 500, "body": str(e)}
