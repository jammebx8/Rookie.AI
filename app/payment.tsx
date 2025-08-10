import RazorpayCheckout from 'react-native-razorpay';

const payWithRazorpay = () => {
  var options = {
    description: 'App Subscription',
    image: 'https://your-logo-url.com/logo.png',
    currency: 'INR',
    key: 'YOUR_RAZORPAY_KEY_ID',
    amount: '50000', // amount in paise (e.g., ₹500 = 50000)
    name: 'Rookie',
    prefill: {
      email: 'user@email.com',
      contact: '9876543210',
      name: 'User Name'
    },
    theme: {color: '#F37254'}
  };
  RazorpayCheckout.open(options).then((data) => {
    // handle success
    alert(`Success: ${data.razorpay_payment_id}`);
  }).catch((error) => {
    // handle failure
    alert(`Error: ${error.code} | ${error.description}`);
  });
};