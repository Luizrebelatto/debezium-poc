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
  op: "c" | "u" | "d" | "r";
  ts_ms: number;
}

interface DebeziumMessage {
  schema: unknown;
  payload: DebeziumPayload;
}

function getOperationName(op: string): string {
  switch (op) {
    case "c":
      return "INSERT";
    case "u":
      return "UPDATE";
    case "d":
      return "DELETE";
    case "r":
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
    console.log(`📌 Tópico: ${topic}`);
    console.log(`📊 Partição: ${partition}`);
    console.log(`🗄️  Tabela: ${payload.source.schema}.${payload.source.table}`);
    console.log(`⚡ Operação: ${getOperationName(payload.op)}`);
    console.log(`🕐 Timestamp: ${new Date(payload.ts_ms).toISOString()}`);

    switch (payload.op) {
      case "c":
        console.log("➕ Novo registro criado:");
        console.log(JSON.stringify(payload.after, null, 2));
        break;

      case "u":
        console.log("📝 Registro atualizado:");
        console.log("  Antes:", JSON.stringify(payload.before, null, 2));
        console.log("  Depois:", JSON.stringify(payload.after, null, 2));
        break;

      case "d":
        console.log("🗑️  Registro removido:");
        console.log(JSON.stringify(payload.before, null, 2));
        break;

      case "r":
        console.log("📸 Snapshot inicial:");
        console.log(JSON.stringify(payload.after, null, 2));
        break;
    }

    console.log("=".repeat(60));
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
    console.log("Mensagem raw:", message.value.toString());
  }
}

async function run() {
  console.log("🚀 Iniciando consumer CDC...");

  await consumer.connect();
  console.log("✅ Conectado ao Kafka");

  // Inscrever-se nos tópicos do Debezium (padrão: topic.prefix.schema.table)
  await consumer.subscribe({
    topics: [/^dbserver1\.public\..*/],
    fromBeginning: true,
  });

  console.log("📡 Inscrito nos tópicos dbserver1.public.*");
  console.log("👀 Aguardando eventos CDC...\n");

  await consumer.run({
    eachMessage: processMessage,
  });
}

// Tratamento de sinais para shutdown gracioso
const shutdown = async () => {
  console.log("\n🛑 Encerrando consumer...");
  await consumer.disconnect();
  console.log("👋 Consumer desconectado");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run().catch(console.error);
