const amqp = require('amqplib');

let connection;
let channel;

const QUEUES = {
  CLICK_PROCESSING: 'click_processing_queue',
  GOOGLE_ADS_ACTIONS: 'google_ads_actions_queue'
};

const initializeQueue = async () => {
  try {
    // Connect to RabbitMQ
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    console.log('✅ Connected to RabbitMQ');

    // Create channel
    channel = await connection.createChannel();
    console.log('✅ RabbitMQ channel created');

    // Assert queues with persistence
    await channel.assertQueue(QUEUES.CLICK_PROCESSING, {
      durable: true, // Survive broker restart
      arguments: {
        'x-message-ttl': 24 * 60 * 60 * 1000 // 24 hours TTL
      }
    });

    await channel.assertQueue(QUEUES.GOOGLE_ADS_ACTIONS, {
      durable: true,
      arguments: {
        'x-message-ttl': 60 * 60 * 1000 // 1 hour TTL
      }
    });

    console.log('✅ RabbitMQ queues asserted');

    // Handle connection errors
    connection.on('error', (error) => {
      console.error('❌ RabbitMQ connection error:', error);
    });

    connection.on('close', () => {
      console.error('❌ RabbitMQ connection closed');
    });

    return { connection, channel };
  } catch (error) {
    console.error('❌ Failed to initialize RabbitMQ:', error);
    throw error;
  }
};

const publishMessage = async (queueName, message, options = {}) => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    const result = await channel.sendToQueue(queueName, messageBuffer, {
      persistent: true, // Ensure message survives broker restart
      ...options
    });

    console.log(`📤 Message published to ${queueName}:`, message);
    return result;
  } catch (error) {
    console.error(`❌ Failed to publish message to ${queueName}:`, error);
    throw error;
  }
};

const consumeMessages = async (queueName, callback, options = {}) => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const defaultOptions = {
      noAck: false, // Manual acknowledgment
      prefetch: 1 // Process one message at a time
    };

    await channel.prefetch(defaultOptions.prefetch);

    const result = await channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const message = JSON.parse(msg.content.toString());
          console.log(`📥 Message received from ${queueName}:`, message);

          // Process the message
          await callback(message);

          // Acknowledge the message
          channel.ack(msg);
          console.log(`✅ Message acknowledged from ${queueName}`);
        } catch (error) {
          console.error(`❌ Error processing message from ${queueName}:`, error);
          
          // Reject the message and requeue it
          channel.nack(msg, false, true);
          console.log(`🔄 Message requeued in ${queueName}`);
        }
      }
    }, { ...defaultOptions, ...options });

    console.log(`✅ Started consuming messages from ${queueName}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to consume messages from ${queueName}:`, error);
    throw error;
  }
};

const closeConnection = async () => {
  try {
    if (channel) {
      await channel.close();
      console.log('✅ RabbitMQ channel closed');
    }
    
    if (connection) {
      await connection.close();
      console.log('✅ RabbitMQ connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing RabbitMQ connection:', error);
    throw error;
  }
};

const getChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
};

const getConnection = () => {
  if (!connection) {
    throw new Error('RabbitMQ connection not initialized');
  }
  return connection;
};

module.exports = {
  initializeQueue,
  publishMessage,
  consumeMessages,
  closeConnection,
  getChannel,
  getConnection,
  QUEUES
}; 