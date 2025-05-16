require('dotenv').config();
const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

app.use(express.json());
app.use(express.static('public'));

const memory = {}; // To temporarily store customer and bank account IDs

// Step 1: Create customer and bank account (starts microdeposits)
app.post('/create-bank-account', async (req, res) => {
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

    memory[email] = { customerId: customer.id, bankAccountId: bankAccount.id };

    res.json({
      message: 'Bank account added. Please wait for microdeposits and then verify.',
      customerId: customer.id,
      bankAccountId: bankAccount.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Verify microdeposit amounts
app.post('/verify-bank-account', async (req, res) => {
  const { email, amount1, amount2 } = req.body;
  const record = memory[email];

  if (!record) {
    return res.status(400).json({ error: 'No bank account record found for this email.' });
  }

  try {
    const verification = await stripe.customers.verifySource(
      record.customerId,
      record.bankAccountId,
      { amounts: [parseInt(amount1), parseInt(amount2)] }
    );

    res.json({ message: 'Bank account verified!', verification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(4242, () => console.log('Server running on http://localhost:4242'));
