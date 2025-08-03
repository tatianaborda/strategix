# ⚡ Strategix

**Strategix is a no-code strategy builder for automated onchain trading using the 1inch Limit Order Protocol. Users can define custom strategies — like price triggers or asset pair conditions — and our app automatically creates and submits signed limit orders based on those strategies, directly onchain. All without writing a single line of code**


> 🏆 **Built for 1inch Expand Limit Order Protocol Track** - Extending 1inch's capabilities with advanced automated trading strategies

## 🌟 Overview

Limit Order Bot Maker democratizes algorithmic trading by allowing anyone to create sophisticated trading strategies without writing a single line of code. Built on top of 1inch's Limit Order Protocol, our platform transforms complex trading logic into simple, visual configurations.

### 🎯 What Makes Us Different

- **No-Code Strategy Builder**: Visual interface for creating complex trading bots
- **Advanced Strategy Support**: Grid Trading, TWAP, Take Profit/Stop Loss, and more
- **Real Onchain Execution**: Direct integration with 1inch Limit Order Protocol
- **User-Friendly Dashboard**: Monitor and manage all your strategies in one place

## 🚀 Features

### 🎨 Visual Strategy Builder
- Interface for strategy creation
- Real-time strategy visualization
- Condition-based trigger system

### 📊 Supported Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **Grid Trading** | Places buy/sell orders at intervals around current price | Sideways markets |
| **TWAP (Time-Weighted Average Price)** | Splits large orders across time | Minimize price impact |
| **Take Profit / Stop Loss** | Automatic position management | Risk management |
| **Dollar Cost Averaging (DCA)** | Regular purchases regardless of price | Long-term accumulation |

### 🔧 Technical Features
- **Custom Limit Orders**: Creates specialized orders not available in standard APIs
- **Gas Optimization**: Smart gas price monitoring and adjustment
- **Multi-Token Support**: Works with any ERC-20 token on Ethereum
- **Real-time Monitoring**: Live updates on order status and execution

## 🏗️ Architecture

### Backend Stack
- **Node.js + Express**: RESTful API server
- **Sequelize ORM**: Database abstraction layer
- **MySQL**: Persistent data storage
- **Hardhat Fork**: Mainnet simulation for testing
- **Ethers.js**: Ethereum blockchain interaction

### Frontend Stack
- **React 18**: Modern UI framework
- **Tailwind CSS**: Utility-first styling
- **Ethers.js**: Web3 integration
- **MetaMask**: Wallet connection

### Blockchain Integration
- **1inch Limit Order Protocol**: Core trading infrastructure
- **Ethereum Mainnet**: Production deployment
- **Custom Smart Contracts**: Extended functionality hooks

## 📋 Prerequisites

- Node.js 18.x or higher
- MySQL 8.0+
- MetaMask wallet
- Ethereum mainnet access

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone https://github.com/tatianaborda/strategix.git
cd strategix
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd back
npm install

# Install frontend dependencies
cd front
npm install


### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Configure your environment variables
```

Required environment variables:
```env
# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=strategix

# Blockchain
ETHEREUM_RPC_URL=your_ethereum_rpc_url
PRIVATE_KEY=your_private_key_for_bot_execution

# 1inch API
ONEINCH_API_KEY=your_1inch_api_key


### 4. Database Setup
```bash
# Create database
npx sequelize-cli db:create

# Run migrations
npx sequelize-cli db:migrate

# Seed initial data (optional)
npx sequelize-cli db:seed:all
```

### 5. Start Development Servers
```bash
cd front
# Start backend server (port 4500)
npm run dev

# In another terminal, start frontend (port 5173)
cd front
npm start
```

## 🔗 1inch Protocol Integration

### Custom Limit Order Implementation

My platform extends 1inch's Limit Order Protocol with custom hooks and strategies:

```javascript
// Example: TWAP Strategy Implementation
const createTWAPOrder = async (params) => {
  const { token, amount, intervals, duration } = params;
  
  // Calculate order chunks
  const chunkSize = amount / intervals;
  const timeInterval = duration / intervals;
  
  // Create series of limit orders
  for (let i = 0; i < intervals; i++) {
    await createLimitOrder({
      token,
      amount: chunkSize,
      executeAt: Date.now() + (timeInterval * i * 1000),
      // Custom strategy logic
    });
  }
};
```

### Advanced Features
- **Dynamic Price Adjustment**: Orders adjust based on market conditions
- **Gas Price Optimization**: Automatic gas price monitoring
- **Slippage Protection**: Built-in slippage tolerance management
- **MEV Protection**: Strategies to minimize MEV impact

## 🎮 Usage Guide

### Creating Your First Strategy

1. **Connect Wallet**: Link your MetaMask wallet
2. **Choose Strategy**: Select from pre-built templates
3. **Configure Parameters**: Set your trading conditions
4. **Preview & Deploy**: Review and activate your strategy
5. **Monitor Performance**: Track execution in real-time


## 📊 API Documentation

### Core Endpoints

#### Strategies
- `GET /api/strategies` - List all user strategies
- `POST /api/strategies` - Create new strategy
- `PUT /api/strategies/:id` - Update strategy
- `DELETE /api/strategies/:id` - Delete strategy

#### Orders
- `GET /api/orders` - List orders for strategy
- `POST /api/orders/execute` - Manually execute order
- `GET /api/orders/:id/status` - Get order status


## 🛡️ Security Considerations

- **Private Key Management**: Keys stored securely with encryption
- **Rate Limiting**: API endpoints protected against abuse
- **Input Validation**: All user inputs sanitized and validated
- **Audit Trail**: Complete logging of all trading actions

## 🔮 Roadmap

### Phase 1 (Current)
- [x] Basic strategy builder
- [x] 1inch integration
- [x] Web interface

### Phase 2 (Next)
- [ ] Advanced charting integration
- [ ] Social trading features
- [ ] Mobile app
- [ ] Multi-chain support

### Phase 3 (Future)
- [ ] AI-powered strategy suggestions
- [ ] Institutional features
- [ ] Strategy marketplace
- [ ] Advanced analytics

## 🤝 Contributing

We welcome contributions!

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request


## 🏆 Competition Compliance

### 1inch Expand Limit Order Protocol Track Requirements

✅ **Onchain Execution**: All strategies execute real transactions on Ethereum mainnet on local  
✅ **Custom Limit Orders**: Implementation uses custom order logic, not official 1inch API  
✅ **Consistent Commits**: Active development with regular commit history  
✅ **UI Implementation**: Complete web interface for strategy management  

### Innovation Points
- **Strategy Templates**: Pre-built configurations for common trading patterns
- **Visual Builder**: No-code approach to complex strategy creation
- **Real-time Monitoring**: Live dashboard for strategy performance
- **Gas Optimization**: Smart gas price management for cost efficiency


## 🙏 Acknowledgments

- [1inch Protocol](https://1inch.io/) for the innovative Limit Order Protocol
- [Ethereum](https://ethereum.org/) for the robust blockchain infrastructure
- The DeFi community for inspiration and feedback

---

**Made with ❤️ for the 1inch community**

*Democratizing algorithmic trading, one strategy at a time.*
