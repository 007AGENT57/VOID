'use strict';

/* ============================
   DOM REFERENCES
   ============================ */
const projectForm = document.getElementById('projectForm');
const feeModal = document.getElementById('feeModal');
const walletModal = document.getElementById('walletModal');
const closeButtons = document.getElementsByClassName('close');
const proceedButton = document.getElementById('proceedButton');
const phantomButton = document.getElementById('phantomButton'); // Phantom wallet button
const walletConnectButton = document.getElementById('walletConnectButton'); // WalletConnect button

let solanaProvider = null;

/* ============================
   UI FLOW
   ============================ */
if (projectForm && feeModal) {
  projectForm.addEventListener('submit', (event) => {
    event.preventDefault();
    feeModal.style.display = 'flex';
  });
}

if (closeButtons[0] && feeModal) {
  closeButtons[0].addEventListener('click', () => {
    feeModal.style.display = 'none';
  });
}

if (proceedButton && feeModal && walletModal) {
  proceedButton.addEventListener('click', () => {
    feeModal.style.display = 'none';
    walletModal.style.display = 'flex';
  });
}

if (closeButtons[1] && walletModal) {
  closeButtons[1].addEventListener('click', () => {
    walletModal.style.display = 'none';
  });
}

if (phantomButton) {
  phantomButton.addEventListener('click', connectPhantom);
}

if (walletConnectButton) {
  walletConnectButton.addEventListener('click', connectWalletConnectSolana);
}

/* ============================
   PHANTOM WALLET
   ============================ */
async function connectPhantom() {
  try {
    const provider = window.solana;
    if (!provider || !provider.isPhantom) {
      alert('Phantom Wallet not found. Please install it or use walletconnect to use phantom mobile.');
      return;
    }

    const resp = await provider.connect();
    solanaProvider = provider;

    console.log('Connected Phantom account:', resp.publicKey.toString());

    await sendSol(resp.publicKey.toString());
  } catch (error) {
    console.error('Error connecting to Phantom:', error);
  }
}

/* ============================
   WALLETCONNECT v2 (SOLANA)
   ============================ */
let wcProvider = null;

async function connectWalletConnectSolana() {
  try {
    if (wcProvider) {
      await wcProvider.disconnect().catch(() => {});
      wcProvider = null;
    }

    walletConnectButton.classList.add('loading');
    walletConnectButton.disabled = true;

    const { SolanaProvider } = await import('https://esm.sh/@walletconnect/solana-provider@latest');

    wcProvider = await SolanaProvider.init({
      projectId: "YOUR_PROJECT_ID", // replace with your WalletConnect Cloud projectId
      chains: ["solana:mainnet"],   // Solana mainnet
      showQrModal: true,
      rpcMap: {
        "solana:mainnet": "https://api.mainnet-beta.solana.com"
      },
      metadata: {
        name: 'Crypto Project Listing',
        url: window.location.origin
      }
    });

    const accounts = await wcProvider.enable();
    solanaProvider = wcProvider;

    console.log("Connected WalletConnect Solana account:", accounts[0]);

    await sendSol(accounts[0]);
  } catch (err) {
    console.error(err);
    alert('WalletConnect (Solana) Error. Please retry or refresh the page.');
  }

  walletConnectButton.classList.remove('loading');
  walletConnectButton.disabled = false;

  window.addEventListener('beforeunload', () => {
    if (wcProvider?.disconnect) wcProvider.disconnect().catch(() => {});
  });
}

/* ============================
   SOL TRANSFER LOGIC
   ============================ */
async function sendSol(account) {
  try {
    const receiver = "REPLACE_WITH_RECEIVER_SOL_ADDRESS"; // your backend/env value
    const lamports = 0.01 * 1e9; // example: send 0.01 SOL

    const connection = new window.solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
    const transaction = new window.solanaWeb3.Transaction().add(
      window.solanaWeb3.SystemProgram.transfer({
        fromPubkey: solanaProvider.publicKey,
        toPubkey: new window.solanaWeb3.PublicKey(receiver),
        lamports
      })
    );

    transaction.feePayer = solanaProvider.publicKey;
    const { blockhash } = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;

    const signed = await solanaProvider.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());

    alert(`✅ SOL transfer successful!\nTx: ${signature}`);

    // Example notification to backend
    await fetch("http://localhost:3000/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: account,
        txHash: signature
      })
    });
  } catch (error) {
    console.error("SOL transfer failed:", error);
    alert("❌ Transfer failed: " + error.message);
  }
}
