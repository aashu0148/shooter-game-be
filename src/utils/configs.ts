import dotenv from "dotenv";
dotenv.config();

const appEnvs = {
  PORT: process.env.PORT || "5000",
  FRONTEND_URL: process.env.FRONTEND_URL || "",
};

const appName = "Shooter";

export { appEnvs, appName };
