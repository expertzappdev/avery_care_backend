// Check email ends with @gmail.com 
const isValidGmail = (email) => {
    const regex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return regex.test(email);
};

const isValidPhone = (phone) => {
    const regex = /^[6-9]\d{9}$/;
    return regex.test(phone);
};

const isValidOtp = (otp) => {
    const regex = /^\d{4}$/;
    return regex.test(otp);
};


export { isValidGmail, isValidPhone, isValidOtp };