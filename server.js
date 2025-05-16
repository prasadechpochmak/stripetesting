require('dotenv').config();
const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

app.use(express.json());
app.use(express.static('public'));

app.post('/create-charge', async (req, res) => {
  const { name, email, accountNumber, routingNumber } = req.body;

  try {
    const customer = await stripe.customers.create({ name, email });

    const bankAccount = await stripe.customers.createSource(customer.id, {
      source: {
        object: 'bank_account',
        country: 'US',
        currency: 'usd',
        routing_number: routingNumber,
        account_number: accountNumber,
        account_holder_name: name,
        account_holder_type: 'individual',
      },
    });

    const charge = await stripe.charges.create({
      amount: 1000,
      currency: 'usd',
      customer: customer.id,
      source: bankAccount.id,
      description: 'ACH Reverse Example',
    });

    res.json({ success: true, charge });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(4242, () => console.log('Server running on http://localhost:4242'));
