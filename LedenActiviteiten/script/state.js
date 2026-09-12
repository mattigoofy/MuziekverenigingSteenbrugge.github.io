const state = {
    email: localStorage.getItem("emailAanwezighedenFanfare"),
    data: JSON.parse(localStorage.getItem("dataAanwezighedenSteenbrugge")),
    scriptURL: "https://script.google.com/macros/s/AKfycbxZnLV4jeG1e-124oRXeYH6EL5ugfMPsrg-ORNUR8l68OlA00lLd0YXKVnD9BtMGv23/exec",
    bulletsDisabled: true,
    send: false,
    makeAccount: false
};

export { state };