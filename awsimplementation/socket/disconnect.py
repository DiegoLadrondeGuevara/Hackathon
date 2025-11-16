import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table("Connections")

def lambda_handler(event, context):
    logger.info("=== WebSocket $disconnect ===")
    logger.info(json.dumps(event))

    try:
        connection_id = event["requestContext"]["connectionId"]

        connections_table.delete_item(Key={"connectionId": connection_id})

        return {
            "statusCode": 200,
            "body": "Disconnected"
        }

    except Exception as e:
        logger.error(str(e))
        return {
            "statusCode": 200,
            "body": json.dumps({"error": str(e)})
        }
