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

const isValidTime = (time) => {
    const regex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    return regex.test(time);
};


export { isValidGmail, isValidPhone, isValidOtp, isValidTime };