import mongoose from "mongoose";

function getErrorText(error) {
  return [
    error?.message,
    error?.errorResponse?.errmsg,
    error?.cause?.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isTransactionUnsupportedError(error) {
  const text = getErrorText(error);
  return (
    text.includes(
      "transaction numbers are only allowed on a replica set member or mongos",
    ) ||
    text.includes("transactions are not supported") ||
    text.includes("transaction support")
  );
}

export async function runWithOptionalTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupportedError(error)) {
      console.warn(
        "Transactions are not available in this MongoDB setup. Running without transaction.",
      );
      return work(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
