require("dotenv").config();
const logger = require("./utils/logger");

const { transporter } = require("./config/email");

async function testEmail() {
  try {
    await transporter.verify();
    logger.info("✅ Email configuration is working!");
  } catch (error) {
    logger.error("❌ Email configuration failed:");
    logger.error(error.message);
  }
}

testEmail();
