import json
import boto3
import uuid
import os
import traceback

dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("TABLE_NAME", "dev-t_reportes")
reportes_table = dynamodb.Table(table_name)
connections_table = dynamodb.Table(os.environ.get("CONNECTIONS_TABLE", "Connections"))

def lambda_handler(event, context):
    try:
        # El body puede venir como string o dict dependiendo de cómo lo envíe API Gateway
        raw_body = event.get("body", "{}")
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        else:
            body = raw_body
        
        required = ["tipo_incidente", "ubicacion", "tipo_usuario", "descripcion"]

        missing = [x for x in required if x not in body]
        if missing:
            return {"statusCode": 400, "body": json.dumps({"error": f"Faltan campos: {missing}"})}

        uuidv4 = str(uuid.uuid4())
        tenant_id = body.get("tenant_id", "utec")
        
        # nivel_urgencia es opcional, con valor por defecto
        nivel_urgencia = body.get("nivel_urgencia", "media")

        reporte = {
            "tenant_id": tenant_id,
            "uuid": uuidv4,
            "tipo_incidente": body["tipo_incidente"],
            "nivel_urgencia": nivel_urgencia,
            "ubicacion": body["ubicacion"],
            "tipo_usuario": body["tipo_usuario"],
            "descripcion": body["descripcion"],
            "estado": "pendiente"
        }

        # Guardar en dev-t_reportes
        reportes_table.put_item(Item=reporte)
        print(f"✅ Reporte guardado: {uuidv4}")

        # Notificar por WebSocket a todos los conectados
        try:
            domain = event["requestContext"]["domainName"]
            stage = event["requestContext"]["stage"]
            ws_endpoint = f"https://{domain}/{stage}"
            
            api = boto3.client("apigatewaymanagementapi", endpoint_url=ws_endpoint)
            connections = connections_table.scan().get("Items", [])
            
            message = {
                "type": "nuevoReporte",
                "data": reporte
            }
            
            for conn in connections:
                try:
                    api.post_to_connection(
                        ConnectionId=conn["connectionId"],
                        Data=json.dumps(message)
                    )
                except Exception as e:
                    print(f"⚠️ Error enviando a {conn.get('connectionId', 'unknown')}: {str(e)}")
        except Exception as e:
            print(f"⚠️ No se pudo notificar por WebSocket: {str(e)}")

        return {"statusCode": 200, "body": json.dumps({"mensaje": "Reporte creado", "uuid": uuidv4, "reporte": reporte})}

    except Exception as e:
        traceback.print_exc()
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
