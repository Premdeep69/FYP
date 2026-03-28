import stripe from "../config/stripe.js";
import Payment from "../models/payment.js";
import Subscription from "../models/subscription.js";
import Session from "../models/session.js";
import User from "../models/users.js";
import invoiceService from "../services/invoiceService.js";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create payment intent for session booking
export const createSessionPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId, amount, trainerId } = req.body;

    // Validate session exists
    const session = await Session.findById(sessionId).populate('trainerId', 'name');
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Get or create Stripe customer
    let customer;
    const user = await User.findById(userId);
    
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: userId.toString(),
        },
      });
      
      // Save customer ID to user
      await User.findByIdAndUpdate(userId, {
        stripeCustomerId: customer.id,
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customer.id,
      metadata: {
        userId: userId.toString(),
        sessionId: sessionId.toString(),
        trainerId: trainerId.toString(),
        type: 'session',
      },
      description: `Training session with ${session.trainerId.name}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Save payment record
    const payment = await Payment.create({
      userId,
      trainerId,
      sessionId,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: customer.id,
      amount: Math.round(amount * 100),
      paymentType: 'session',
      description: `Training session with ${session.trainerId.name}`,
      metadata: {
        sessionDate: session.scheduledDate,
        sessionDuration: session.duration,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error('Create session payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create subscription
export const createSubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const { priceId, planName } = req.body;

    const user = await User.findById(userId);

    // Get or create Stripe customer
    let customer;
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: userId.toString(),
        },
      });
      
      await User.findByIdAndUpdate(userId, {
        stripeCustomerId: customer.id,
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId.toString(),
        planName,
      },
    });

    // Get price details
    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(price.product);

    // Save subscription record
    const subscriptionRecord = await Subscription.create({
      userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customer.id,
      stripePriceId: priceId,
      plan: {
        name: planName,
        price: price.unit_amount,
        interval: price.recurring.interval,
        features: product.metadata.features ? product.metadata.features.split(',') : [],
      },
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscriptionRecordId: subscriptionRecord._id,
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get user's payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const payments = await Payment.find({ userId })
      .populate('trainerId', 'name email')
      .populate('sessionId', 'scheduledDate duration')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments({ userId });

    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's subscriptions
export const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user._id;

    const subscriptions = await Subscription.find({ userId })
      .sort({ createdAt: -1 });

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subscriptionId } = req.params;

    // Find subscription record
    const subscriptionRecord = await Subscription.findOne({
      _id: subscriptionId,
      userId,
    });

    if (!subscriptionRecord) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Cancel in Stripe
    const subscription = await stripe.subscriptions.update(
      subscriptionRecord.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // Update local record
    await Subscription.findByIdAndUpdate(subscriptionId, {
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    });

    res.json({ message: "Subscription will be canceled at the end of the current period" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get trainer earnings
export const getTrainerEarnings = async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const earnings = await Payment.aggregate([
      {
        $match: {
          trainerId: trainerId,
          status: 'succeeded',
          paymentType: 'session',
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$amount' },
          totalSessions: { $sum: 1 },
          averageSessionPrice: { $avg: '$amount' },
        },
      },
    ]);

    const monthlyEarnings = await Payment.aggregate([
      {
        $match: {
          trainerId: trainerId,
          status: 'succeeded',
          paymentType: 'session',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          earnings: { $sum: '$amount' },
          sessions: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 },
      },
      {
        $limit: 12,
      },
    ]);

    res.json({
      summary: earnings[0] || {
        totalEarnings: 0,
        totalSessions: 0,
        averageSessionPrice: 0,
      },
      monthlyBreakdown: monthlyEarnings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Webhook handler for Stripe events
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Helper functions for webhook handlers
const handlePaymentIntentSucceeded = async (paymentIntent) => {
  await Payment.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntent.id },
    { 
      status: 'succeeded',
      stripeWebhookData: paymentIntent,
    }
  );

  // If it's a session payment, update session status
  if (paymentIntent.metadata.type === 'session') {
    await Session.findByIdAndUpdate(
      paymentIntent.metadata.sessionId,
      { status: 'confirmed' }
    );
  }
};

const handlePaymentIntentFailed = async (paymentIntent) => {
  await Payment.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntent.id },
    { 
      status: 'failed',
      stripeWebhookData: paymentIntent,
    }
  );
};

const handleInvoicePaymentSucceeded = async (invoice) => {
  // Handle subscription payment success
  if (invoice.subscription) {
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: invoice.subscription },
      { status: 'active' }
    );
  }
};

const handleSubscriptionUpdated = async (subscription) => {
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    }
  );
};

const handleSubscriptionDeleted = async (subscription) => {
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    { 
      status: 'canceled',
      canceledAt: new Date(),
    }
  );
};


// Generate invoice for a payment
export const generatePaymentInvoice = async (req, res) => {
  try {
    const userId = req.user._id;
    const { paymentId } = req.params;

    const payment = await Payment.findOne({ _id: paymentId, userId })
      .populate('userId', 'name email address')
      .populate('trainerId', 'name');

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== 'succeeded') {
      return res.status(400).json({ message: "Cannot generate invoice for unsuccessful payment" });
    }

    // Check if invoice already exists
    if (payment.invoiceUrl) {
      return res.json({
        invoiceUrl: payment.invoiceUrl,
        invoiceNumber: payment.invoiceNumber
      });
    }

    // Generate invoice
    const invoice = await invoiceService.generatePaymentReceipt(payment);

    // Update payment with invoice info
    await Payment.findByIdAndUpdate(paymentId, {
      invoiceUrl: invoice.url,
      invoiceNumber: invoice.filename.replace('invoice-', '').replace('.pdf', ''),
      invoiceGeneratedAt: new Date()
    });

    res.json({
      invoiceUrl: invoice.url,
      invoiceNumber: invoice.filename.replace('invoice-', '').replace('.pdf', ''),
      message: 'Invoice generated successfully'
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ message: 'Failed to generate invoice', error: error.message });
  }
};

// Download invoice
export const downloadInvoice = async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../invoices', filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.download(filepath);
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({ message: 'Failed to download invoice' });
  }
};

// Get payment methods for user
export const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user.stripeCustomerId) {
      return res.json({ paymentMethods: [] });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    res.json({
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        isDefault: pm.id === user.defaultPaymentMethodId
      }))
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Failed to retrieve payment methods' });
  }
};

// Add payment method
export const addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const { paymentMethodId } = req.body;

    const user = await User.findById(userId);

    // Get or create Stripe customer
    let customer;
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: userId.toString() },
      });
      
      await User.findByIdAndUpdate(userId, {
        stripeCustomerId: customer.id,
      });
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Set as default if it's the first payment method
    const existingMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });

    if (existingMethods.data.length === 1) {
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      await User.findByIdAndUpdate(userId, {
        defaultPaymentMethodId: paymentMethodId,
      });
    }

    res.json({ message: 'Payment method added successfully' });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ message: 'Failed to add payment method', error: error.message });
  }
};

// Remove payment method
export const removePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;

    await stripe.paymentMethods.detach(paymentMethodId);

    res.json({ message: 'Payment method removed successfully' });
  } catch (error) {
    console.error('Remove payment method error:', error);
    res.status(500).json({ message: 'Failed to remove payment method' });
  }
};

// Set default payment method
export const setDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const { paymentMethodId } = req.body;

    const user = await User.findById(userId);

    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: 'No Stripe customer found' });
    }

    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    await User.findByIdAndUpdate(userId, {
      defaultPaymentMethodId: paymentMethodId,
    });

    res.json({ message: 'Default payment method updated successfully' });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({ message: 'Failed to set default payment method' });
  }
};

// Refund payment
export const refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'succeeded') {
      return res.status(400).json({ message: 'Can only refund successful payments' });
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
      reason: reason || 'requested_by_customer',
      metadata: {
        paymentId: paymentId.toString(),
        refundedBy: req.user._id.toString()
      }
    });

    // Update payment record
    await Payment.findByIdAndUpdate(paymentId, {
      status: 'refunded',
      refundId: refund.id,
      refundedAmount: refund.amount,
      refundedAt: new Date(),
      refundReason: reason
    });

    res.json({
      message: 'Payment refunded successfully',
      refundId: refund.id,
      amount: refund.amount / 100
    });
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({ message: 'Failed to process refund', error: error.message });
  }
};

// Get payment statistics
export const getPaymentStatistics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const stats = await Payment.aggregate([
      {
        $match: {
          userId: userId,
          status: 'succeeded',
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
          averagePayment: { $avg: '$amount' },
        },
      },
    ]);

    const paymentsByType = await Payment.aggregate([
      {
        $match: {
          userId: userId,
          status: 'succeeded',
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$paymentType',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthlySpending = await Payment.aggregate([
      {
        $match: {
          userId: userId,
          status: 'succeeded',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          spending: { $sum: '$amount' },
          payments: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 },
      },
      {
        $limit: 12,
      },
    ]);

    res.json({
      summary: stats[0] || {
        totalSpent: 0,
        totalPayments: 0,
        averagePayment: 0,
      },
      byType: paymentsByType,
      monthlyBreakdown: monthlySpending,
    });
  } catch (error) {
    console.error('Get payment statistics error:', error);
    res.status(500).json({ message: 'Failed to retrieve statistics' });
  }
};

// Verify payment status
export const verifyPaymentStatus = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });

    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      paymentMethod: paymentIntent.payment_method,
      localStatus: payment?.status,
      created: new Date(paymentIntent.created * 1000)
    });
  } catch (error) {
    console.error('Verify payment status error:', error);
    res.status(500).json({ message: 'Failed to verify payment status' });
  }
};
