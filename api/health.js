const { getAllowedHosts } = require("../lib/relay");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ status: "error", message: "GET only" });
  }
  return res.status(200).json({
    status: "ok",
    mode: "allow-listed",
    allowedHostCount: getAllowedHosts().size
  });
};