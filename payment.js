// API Login ID: 6VxmmME67Hs
// Transaction key: 2H9FV283hB8uGd2y

const { APIContracts, APIControllers } = require('authorizenet');

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;

function checkCustomerExists(merchantCustomerId, callback) {

    var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName('6VxmmME67Hs');
    merchantAuthenticationType.setTransactionKey('2H9FV283hB8uGd2y');

    const getRequest = new ApiContracts.GetCustomerProfileRequest();
    getRequest.setMerchantAuthentication(merchantAuthenticationType);
    getRequest.setMerchantCustomerId(merchantCustomerId);

    const ctrl = new ApiControllers.GetCustomerProfileController(getRequest.getJSON());

    ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.GetCustomerProfileResponse(apiResponse);

        if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
            const profileId = response.getProfile().getCustomerProfileId();
            return callback(null, profileId); // Đã tồn tại
        } else {
            const code = response.getMessages().getMessage()[0].getCode();
            if (code === 'E00040') {
                return callback(null, null); // Không tồn tại
            }
            return callback(new Error(response.getMessages().getMessage()[0].getText()));
        }
    });
}

function createCustomerProfile(customerData, callback) {

    const { firstName, lastName, email, address, country, zip, cardNumber, expiryDate, CVV } = customerData;

    var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName('6VxmmME67Hs');
    merchantAuthenticationType.setTransactionKey('2H9FV283hB8uGd2y');

    var creditCard = new ApiContracts.CreditCardType();
    creditCard.setCardNumber(cardNumber);
    creditCard.setExpirationDate(expiryDate);
    creditCard.setCardCode(CVV);

    var paymentType = new ApiContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    var customerAddress = new ApiContracts.CustomerAddressType();
    customerAddress.setFirstName(firstName);
    customerAddress.setLastName(lastName);
    customerAddress.setAddress(address);
    customerAddress.setCity(country);
    customerAddress.setState('WA');
    customerAddress.setZip(zip);
    customerAddress.setCountry(country);
    customerAddress.setPhoneNumber('000-000-0000');

    var customerPaymentProfileType = new ApiContracts.CustomerPaymentProfileType();
    customerPaymentProfileType.setCustomerType(ApiContracts.CustomerTypeEnum.INDIVIDUAL);
    customerPaymentProfileType.setPayment(paymentType);
    customerPaymentProfileType.setBillTo(customerAddress);

    var paymentProfilesList = [];
    paymentProfilesList.push(customerPaymentProfileType);

    var customerProfileType = new ApiContracts.CustomerProfileType();
    customerProfileType.setMerchantCustomerId(firstName + '_' + country);
    customerProfileType.setDescription('Profile description here');
    customerProfileType.setEmail(email);
    customerProfileType.setPaymentProfiles(paymentProfilesList);

    var createRequest = new ApiContracts.CreateCustomerProfileRequest();
    createRequest.setProfile(customerProfileType);
    createRequest.setValidationMode(ApiContracts.ValidationModeEnum.TESTMODE);
    createRequest.setMerchantAuthentication(merchantAuthenticationType);

    //pretty print request
    console.log(JSON.stringify(createRequest.getJSON(), null, 2));


    var ctrl = new ApiControllers.CreateCustomerProfileController(createRequest.getJSON());

    ctrl.execute(function () {

        const apiResponse = ctrl.getResponse();

        let response = null;
        if (apiResponse != null) {
            response = new ApiContracts.CreateCustomerProfileResponse(apiResponse);
            console.log(JSON.stringify(response, null, 2));
        } else {
            const apiError = ctrl.getError();
            console.error('Lỗi khi gửi yêu cầu:', apiError);
            return callback(new Error('Null response received from API'));
        }

        const resultCode = response.getMessages().getResultCode();

        if (resultCode === ApiContracts.MessageTypeEnum.OK) {
            const customerProfileId = response.getCustomerProfileId();
            console.log('Tạo profile thành công, ID:', customerProfileId);
            return callback(null, customerProfileId);
        } else {
            const errorCode = response.getMessages().getMessage()[0].getCode();
            const errorMessage = response.getMessages().getMessage()[0].getText();

            console.warn('Kết quả không OK:', errorCode, errorMessage);

            // Trường hợp lỗi khác
            return callback(new Error(errorMessage));
        }
    });
}

if (require.main === module) {
    createCustomerProfile(function () {
        console.log('createCustomerProfile call complete.');
    });
}

const getCustomerProfile = (customerProfileId, callback) => {
    const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName('6VxmmME67Hs');
    merchantAuthenticationType.setTransactionKey('2H9FV283hB8uGd2y');

    const getRequest = new APIContracts.GetCustomerProfileRequest();
    getRequest.setMerchantAuthentication(merchantAuthenticationType);
    getRequest.setCustomerProfileId(customerProfileId);

    const ctrl = new APIControllers.GetCustomerProfileController(getRequest.getJSON());

    ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new APIContracts.GetCustomerProfileResponse(apiResponse);

        if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
            const profile = response.getProfile();
            const paymentProfiles = profile.getPaymentProfiles();
        
            const paymentInfo = paymentProfiles.map((p) => {
                const card = p.getPayment().getCreditCard();
                return {
                    paymentProfileId: p.getCustomerPaymentProfileId(),
                    cardNumber: card.getCardNumber(),
                    expirationDate: card.getExpirationDate()
                };
            });
        
            callback(null, {
                name: profile.getMerchantCustomerId() || 'Không rõ',
                email: profile.getEmail(),
                description: profile.getDescription(),
                paymentProfiles: paymentInfo
            });
        }
        else {
            callback(response.getMessages().getMessage()[0].getText(), null);
        }
    });
};

// Hàm lấy paymentProfileId từ customerProfileId
function getPaymentProfileId(customerProfileId, callback) {
    const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName('6VxmmME67Hs');
    merchantAuthenticationType.setTransactionKey('2H9FV283hB8uGd2y');

    const getRequest = new APIContracts.GetCustomerPaymentProfileRequest();
    getRequest.setMerchantAuthentication(merchantAuthenticationType);
    getRequest.setCustomerProfileId(customerProfileId);

    const ctrl = new APIControllers.GetCustomerPaymentProfileController(getRequest.getJSON());

    ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new APIContracts.GetCustomerPaymentProfileResponse(apiResponse);

        if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
            const paymentProfile = response.getPaymentProfile();
            const paymentProfileId = paymentProfile.getPaymentProfileId(); // Lấy paymentProfileId
            callback(null, paymentProfileId);
        } else {
            callback(response.getMessages().getMessage()[0].getText(), null);
        }
    });
}

function createTransactionWithCart(customerProfileId, totalAmount, cartItems) {
    return new Promise((resolve, reject) => {
        // Lấy thông tin profile và paymentProfileId từ hàm getCustomerProfile
        getCustomerProfile(customerProfileId, (err, userInfo) => {
            if (err) {
                return reject("Lỗi lấy thông tin user: " + err);
            }

            // Lấy paymentProfileId từ danh sách paymentProfiles
            const paymentProfiles = userInfo.paymentProfiles;
            if (!paymentProfiles || paymentProfiles.length === 0) {
                return reject("Không có payment profile mặc định.");
            }

            // Giả sử chọn paymentProfile mặc định (nếu có)
            const defaultPaymentProfile = paymentProfiles[0];  // Giả sử lấy cái đầu tiên nếu không có mặc định
            const paymentProfileId = defaultPaymentProfile.paymentProfileId;

            // Gán line items từ giỏ hàng
            const lineItems = new APIContracts.ArrayOfLineItem();

            const lineItemList = cartItems.map((item, index) => {
                const lineItem = new APIContracts.LineItemType();
                lineItem.setItemId(item.id || `item-${index + 1}`);
                lineItem.setName(item.name.slice(0, 31));
                // lineItem.setDescription(item.description || '');
                lineItem.setQuantity(item.quantity);
                lineItem.setUnitPrice(item.price);
                return lineItem;
            });

            lineItems.setLineItem(lineItemList);

            // Transaction setup
            const transactionRequestType = new APIContracts.TransactionRequestType();
            transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);

            // Sử dụng totalAmount đã tính sẵn
            transactionRequestType.setAmount(totalAmount);
            transactionRequestType.setLineItems(lineItems);

            const profile = new APIContracts.CustomerProfilePaymentType();
            profile.setCustomerProfileId(customerProfileId);  // Chỉ cần customerProfileId đã có
            profile.setPaymentProfile(new APIContracts.PaymentProfile({ paymentProfileId }));  // Sử dụng paymentProfileId đã lấy

            transactionRequestType.setProfile(profile);

            const createRequest = new APIContracts.CreateTransactionRequest();
            createRequest.setMerchantAuthentication(new APIContracts.MerchantAuthenticationType({
                name: '6VxmmME67Hs',
                transactionKey: '2H9FV283hB8uGd2y',
            }));
            createRequest.setTransactionRequest(transactionRequestType);

            const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());

            ctrl.execute(() => {
                const apiResponse = ctrl.getResponse();
                const response = new APIContracts.CreateTransactionResponse(apiResponse);

                if (response != null && response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                    const txn = response.getTransactionResponse();
                    console.log('Giao dịch thành công:', txn.getTransId());
                    resolve(txn);
                } else {
                    console.error('Giao dịch thất bại:', response.getMessages().getMessage()[0].getText());
                    reject(response);
                }
            });
        });
    });
}

function getHostedProfilePage(customerProfileId, callback) {
    const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName('6VxmmME67Hs');
    merchantAuthenticationType.setTransactionKey('2H9FV283hB8uGd2y');

    const request = new APIContracts.GetHostedProfilePageRequest();
    request.setMerchantAuthentication(merchantAuthenticationType);
    request.setCustomerProfileId(customerProfileId);

    const setting = new APIContracts.SettingType();
    setting.setSettingName('hostedProfileReturnUrl');
    setting.setSettingValue('http://localhost:5501/payment.html'); // Đổi thành trang của bạn

    const settingsList = new APIContracts.ArrayOfSetting();
    settingsList.setSetting([setting]);
    request.setHostedProfileSettings(settingsList);

    const ctrl = new APIControllers.GetHostedProfilePageController(request.getJSON());
    ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new APIContracts.GetHostedProfilePageResponse(apiResponse);

        if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
            const token = response.getToken();
            callback(null, token);
        } else {
            const err = response.getMessages().getMessage()[0].getText();
            callback(err, null);
        }
    });
}



module.exports.createCustomerProfile = createCustomerProfile;
module.exports.getHostedProfilePage = getHostedProfilePage;
module.exports.getCustomerProfile = getCustomerProfile;
module.exports.checkCustomerExists = checkCustomerExists;
module.exports.createTransactionWithCart = createTransactionWithCart;