import json
import boto3
import logging
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table("Connections")
incidents_table = dynamodb.Table("Incidents")

def lambda_handler(event, context):
    logger.info("=== WebSocket $connect ===")

    connection_id = event["requestContext"]["connectionId"]
    domain = event["requestContext"]["domainName"]
    stage = event["requestContext"]["stage"]

    api = boto3.client(
        "apigatewaymanagementapi",
        endpoint_url=f"https://{domain}/{stage}"
    )

    try:
        # Guardar la conexión
        connections_table.put_item(Item={
            "connectionId": connection_id,
            "username": "Anónimo"
        })

        logger.info(f"Guardado connectionId: {connection_id}")

        # Obtener todos los incidentes almacenados en DynamoDB
        response = incidents_table.scan()
        incidents = response.get("Items", [])

        # Convertir Decimals a float/str para JSON
        incidents = json.loads(json.dumps(incidents, default=str))

        # Mandar al usuario la lista inicial de incidentes
        api.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps({
                "type": "incidentsList",
                "incidents": incidents
            }).encode("utf-8")
        )

        logger.info("📨 Lista inicial enviada")

        return {"statusCode": 200}

    except Exception as e:
        logger.error(f"❌ ERROR en $connect: {str(e)}")
        return {"statusCode": 500}
