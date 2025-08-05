import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.TWO_FACTOR_API_KEY;
const templateName = process.env.TWO_FACTOR_TEMPLATE_NAME;

export const sendOtpSms = async (phoneNumber, mobileOtp) => {

    try {
        const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phoneNumber}/${mobileOtp}/${templateName}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("OTP Send Error:", error?.response?.data || error.message);
        throw new Error("Error in sending Otp");
    }
};
