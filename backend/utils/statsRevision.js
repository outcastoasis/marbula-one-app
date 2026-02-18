import StatsRevision from "../models/StatsRevision.js";

const GLOBAL_STATS_REVISION_KEY = "global";

const getOrCreateGlobalRevisionDoc = async () =>
  StatsRevision.findOneAndUpdate(
    { key: GLOBAL_STATS_REVISION_KEY },
    { $setOnInsert: { value: 1 } },
    { new: true, upsert: true },
  );

export const getCurrentStatsRevision = async () => {
  const doc = await getOrCreateGlobalRevisionDoc();
  return doc.value;
};

export const bumpStatsRevision = async () => {
  const doc = await StatsRevision.findOneAndUpdate(
    { key: GLOBAL_STATS_REVISION_KEY },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  );
  return doc.value;
};
