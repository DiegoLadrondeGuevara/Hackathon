import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table("Connections")

def lambda_handler(event, context):
    logger.info("=== WebSocket $disconnect ===")

    connection_id = event["requestContext"]["connectionId"]
    domain = event["requestContext"]["domainName"]
    stage = event["requestContext"]["stage"]

    api = boto3.client(
        "apigatewaymanagementapi",
        endpoint_url=f"https://{domain}/{stage}"
    )

    try:
        # Obtener username antes de eliminar
        item = connections_table.get_item(Key={"connectionId": connection_id}).get("Item")
        username = item["username"] if item else "Anónimo"

        # Eliminar conexión
        connections_table.delete_item(Key={"connectionId": connection_id})

        # Obtener todas las conexiones restantes
        result = connections_table.scan()
        connections = result.get("Items", [])

        # Notificación
        notification = {
            "type": "notification",
            "message": f"{username} se ha desconectado"
        }

        user_list = {
            "type": "userList",
            "users": [c["username"] for c in connections]
        }

        # Enviar a todos
        for conn in connections:
            cid = conn["connectionId"]
            try:
                api.post_to_connection(
                    ConnectionId=cid,
                    Data=json.dumps(notification).encode("utf-8")
                )
                api.post_to_connection(
                    ConnectionId=cid,
                    Data=json.dumps(user_list).encode("utf-8")
                )
            except Exception as e:
                logger.error(f"Error notificando a {cid}: {str(e)}")

        return {"statusCode": 200}

    except Exception as e:
        logger.error(f"❌ ERROR en $disconnect: {str(e)}")
        return {"statusCode": 500}
