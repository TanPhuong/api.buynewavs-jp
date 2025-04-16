const express = require('express')
const session = require('express-session');

const dotenv = require('dotenv')
const cors = require('cors')

const xlsx = require('xlsx');
const chokidar = require('chokidar');
const fs = require('fs');

const { getHostedProfilePage, createCustomerProfile, getCustomerProfile, checkCustomerExists, createTransactionWithCart } = require('./payment');

const excelFile = './test-data.xlsx';
const jsonFile = './data.json';

dotenv.config()

const port = process.env.PORT || 3001

const app = express()
app.use(cors({
    credentials: true // Cho phép gửi cookies
}))

app.use(express.json())

app.listen(port, () => console.log('Connecting to port: ' + port))

// Chuyển thông tin từ excel thành json
function convertExcelToJson() {
    const workbook = xlsx.readFile(excelFile);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(sheet);
    fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2));
    console.log(sheet)

    console.log('✅ File đã được cập nhật JSON!');
}

chokidar.watch(excelFile).on('change', () => {
    console.log('📂 File Excel thay đổi, đang cập nhật...');
    convertExcelToJson();
});

// Chuyển thông tin từ json thành excel
function convertJsonToExcel() {
    try {
        // Đọc nội dung file JSON
        const rawData = fs.readFileSync(jsonFile, 'utf8');
        const jsonData = JSON.parse(rawData);

        // Chuyển thành sheet Excel
        const worksheet = xlsx.utils.json_to_sheet(jsonData);

        // Tạo workbook và ghi sheet
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

        // Ghi file Excel
        xlsx.writeFile(workbook, excelFile);
    } catch (error) {
        console.error('Lỗi khi ghi Excel từ JSON:', error.message);
    }
}

chokidar.watch(jsonFile).on('change', () => {
    console.log('📂 File JSON thay đổi, đang cập nhật lại Excel...');
    convertJsonToExcel();
});

// Lưu thông tin cart vào session tương ứng với cookies
app.use(session({
    secret: '79b140749f33f7c51e651b86381dd6bfce5c7d69758dd6b8a302dbc05e17bee18f401c3e793c0d56f13d6e2c3daecb9093922f69d8852de3611b2609407cdb46', // Mã hóa sessionID
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 3 * 24 * 60 * 60 * 1000, // 3 ngày
        httpOnly: true,
        sameSite: 'lax'
    }
}))

app.post('/cart/add', (req, res) => {
    console.log(req.body)
    console.log(req.sessionID)

    if (!req.session.cart) req.session.cart = [];
    req.session.cart.push(req.body);
    req.session.save(() => {
        res.send(req.session);
    });
})

app.delete('/cart/delete', (req, res) => {
    const productIdToDelete = req.body.id;

    if (!req.session.cart) {
        return res.status(200).json({ cart: [] });
    }

    req.session.cart = req.session.cart.filter(item => item.id !== productIdToDelete);

    res.json({ cart: req.session.cart });
})

app.get('/cart/view', (req, res) => {
    const cart = req.session.cart || [];
    console.log(req.sessionID)
    console.log(cart);
    res.json(cart);
})

// Payment API
app.post('/payment/create-profile', (req, res) => {

    console.log(req.body)

    const customerData = req.body;

    const firstName = customerData.firstName?.trim().replace(/\s+/g, '');
    const country = customerData.country?.trim().replace(/\s+/g, '');
    const merchantCustomerId = `${firstName}_${country}` || 'M_';

    checkCustomerExists(merchantCustomerId, (err, existingProfileId) => {
        if (err) {
            console.error('Lỗi kiểm tra customer:', err.message);
            return res.status(500).json({ error: 'Lỗi kiểm tra thông tin khách hàng' });
        }

        if (existingProfileId) {
            console.log('Customer đã tồn tại:', existingProfileId);
            return res.json({ customerProfileId: existingProfileId });
        }

        createCustomerProfile(customerData, (err, customerProfileId) => {
            if (err) {
                console.error('Lỗi tạo profile:', err.message);
                return res.status(500).json({ error: err.message });
            }
    
            console.log('Đã có CustomerProfileId:', res.json({ customerProfileId }));
            res.json({ customerProfileId })
        });

    });

})


app.get('/payment/get-form/:profileId', (req, res) => {
    
    const customerProfileId = req.params.profileId;

    getCustomerProfile(customerProfileId, (err, userInfo) => {
        if (err) return res.status(500).send('Lỗi lấy thông tin user: ' + err);

        getHostedProfilePage(customerProfileId, (err, token) => {
            if (err) return res.status(500).send('Lỗi lấy token: ' + err);

            res.json({
                user: userInfo,
                token: token
            });
        });
    });

});

app.post('/payment/charge/:profileId', (req, res) => {
    const customerProfileId = req.params.profileId;
    const { totalAmount, cartItems } = req.body;

    // Lấy thông tin user (không cần callback vì đang sử dụng Promise)
    getCustomerProfile(customerProfileId, (err, userInfo) => {
        if (err) return res.status(500).send('Lỗi lấy thông tin user: ' + err);

        // Tạo giao dịch với giỏ hàng
        createTransactionWithCart(customerProfileId, totalAmount, cartItems)
            .then((transactionResult) => {
                // Gửi kết quả giao dịch nếu thành công
                res.json({ success: true, transactionResult });
            })
            .catch((err) => {
                // Gửi lỗi nếu giao dịch không thành công
                res.status(500).send('Lỗi khi tạo giao dịch: ' + err);
            });
    });
});




