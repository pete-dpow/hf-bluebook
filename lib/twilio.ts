import twilio from 'twilio';

// Your Twilio credentials (replace with yours!)
const TWILIO_ACCOUNT_SID = "AC7938878a0b911098d786267c41c3bf97"; // Starts with AC...
const TWILIO_AUTH_TOKEN = "0b01eaade6b3bab5397283b00d6803f1";
const TWILIO_WHATSAPP_NUMBER = "whatsapp:+14155238886"; // Your sandbox number

export const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
export const TWILIO_FROM = TWILIO_WHATSAPP_NUMBER;