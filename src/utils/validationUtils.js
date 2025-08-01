// Check email ends with @gmail.com 
const isValidGmail = (email) => {
    const regex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return regex.test(email);
};

const isValidPhone = (phone) => {
    const regex = /^\+91[6-9]\d{9}$/;
    return regex.test(phone);
};

export { isValidGmail, isValidPhone };