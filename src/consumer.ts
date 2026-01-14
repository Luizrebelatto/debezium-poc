import { Kafka, type EachMessagePayload } from "kafkajs";

const kafka = new Kafka({
  clientId: "debezium-consumer",
  brokers: ["localhost:29092"],
});

const consumer = kafka.consumer({ groupId: "cdc-consumer-group" });

interface DebeziumPayload {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  source: {
    version: string;
    connector: string;
    name: string;
    ts_ms: number;
    db: string;
    schema: string;
    table: string;
  };
  op: "create" | "update" | "delete" | "read";
  ts_ms: number;
}

interface DebeziumMessage {
  schema: unknown;
  payload: DebeziumPayload;
}

function getOperationName(op: string): string {
  switch (op) {
    case "create":
      return "INSERT";
    case "update":
      return "UPDATE";
    case "delete":
      return "DELETE";
    case "read":
      return "SNAPSHOT";
    default:
      return "UNKNOWN";
  }
}

async function processMessage({ topic, partition, message }: EachMessagePayload) {
  if (!message.value) {
    console.log("Mensagem sem valor recebida");
    return;
  }

  try {
    const data: DebeziumMessage = JSON.parse(message.value.toString());
    const { payload } = data;

    console.log("\n" + "=".repeat(60));
    console.log(`Topic: ${topic}`);
    console.log(`Partition: ${partition}`);
    console.log(`Table: ${payload.source.schema}.${payload.source.table}`);
    console.log(`Operation: ${getOperationName(payload.op)}`);
    console.log(`Timestamp: ${new Date(payload.ts_ms).toISOString()}`);

    switch (payload.op) {
      case "create":
        console.log("New Register:");
        console.log(JSON.stringify(payload.after, null, 2));
        break;

      case "update":
        console.log("updated register:");
        break;

      case "delete":
        console.log("Register Removed:");
        console.log(JSON.stringify(payload.before, null, 2));
        break;

      case "read":
        console.log("initial snapshot record:");
        console.log(JSON.stringify(payload.after, null, 2));
        break;
    }

    console.log("=".repeat(60));
  } catch (error) {
    console.error("Error to process", error);
  }
}

async function run() {
  await consumer.connect();
  console.log("Connected to kafka");

  await consumer.subscribe({
    topics: [/^dbserver1\.public\..*/],
    fromBeginning: true,
  });

  await consumer.run({
    eachMessage: processMessage,
  });
}

const shutdown = async () => {
  console.log("\stop consumer...");
  await consumer.disconnect();
  console.log("👋 Consumer desconected");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run().catch(console.error);
