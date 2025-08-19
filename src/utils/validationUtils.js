import mongoose from "mongoose";
// Check email ends with @gmail.com 
const isValidGmail = (email) => {
    const regex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return regex.test(email);
};

const isValidPhone = (phone) => {
    const regex = /^\+91[6-9]\d{9}$/;
    return regex.test(phone);
};

const isValidOtp = (otp) => {
    const regex = /^\d{4}$/;
    return regex.test(otp);
};

const isValidISOStringDate = (dateString) => {
    if (typeof dateString !== 'string' || dateString.trim() === '') {
        return false; // Agar string nahi hai ya khaali hai
    }
    const date = new Date(dateString);
    // Check if the date is valid and if its ISO string representation matches the input (optional but good for strictness)
    return !isNaN(date.getTime()); // Check if date is not "Invalid Date"
};

const isValidObjectId = (id) => {
    // Check if the ID is a string and matches the 24-character hexadecimal pattern
    return mongoose.Types.ObjectId.isValid(id)
};

export { isValidGmail, isValidPhone, isValidOtp, isValidISOStringDate, isValidObjectId };