import React, { useState } from "react";

function App() {
    const [account, setAccount] = useState("");
    const [file, setFile] = useState(null);
    const [nftName, setNftName] = useState("");
    const [action, setAction] = useState("register");
    const [verificationResult, setVerificationResult] = useState(null);
    const [registrationResult, setRegistrationResult] = useState(null);

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                setAccount(accounts[0]);
            } catch (error) {
                console.error("MetaMask Connection Error:", error);
                alert("Failed to connect MetaMask!");
            }
        } else {
            alert("MetaMask not detected. Please install it.");
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!account) return alert("Please connect MetaMask first!");
        if (!file || !nftName) return alert("Please upload an image and enter NFT name!");

        const formData = new FormData();
        formData.append("image", file);
        formData.append("name", nftName);
        formData.append("address", account);

        try {
            // Fix: Remove the leading slash to avoid double slash in URL
            const endpoint = action === "register" ? "register" : "verify";
            
            // Detailed logging for debugging
            console.log("Form submission details:", {
                url: `http://localhost:3001/${endpoint}`,
                method: 'POST',
                action: action,
                nftName: nftName,
                address: account,
                hasFile: !!file,
                fileName: file ? file.name : 'no file'  
            });
            
            const response = await fetch(`http://localhost:3001/${endpoint}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (action === 'register') {
                setRegistrationResult(data);
                setVerificationResult(null);
            } else {
                setVerificationResult(data);
                setRegistrationResult(null);
            }
        } catch (error) {
            console.error("Error Details:", {
                message: error.message,
                type: error.constructor.name,
                stack: error.stack
            });

            const errorMessage = error.message.includes("NFT not found") 
                ? "NFT not found - Please check if the NFT name is correct"
                : error.message.includes("connect MetaMask")
                ? "Please connect your MetaMask wallet first"
                : `Error: ${error.message}`;

            if (action === 'register') {
                setRegistrationResult({ error: errorMessage });
                setVerificationResult(null);
            } else {
                setVerificationResult({ error: errorMessage });
                setRegistrationResult(null);
            }
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.cardBox}>
                <h1 style={styles.title}>NFT Registration & Verification</h1>

                <button onClick={connectWallet} style={styles.walletButton}>
                    {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : "Connect MetaMask"}
                </button>

                <div style={styles.actionButtonsContainer}>
                    <label style={styles.actionLabel}>Action:</label>
                    <button
                        onClick={() => setAction("register")}
                        style={action === "register" ? styles.activeButton : styles.inactiveButton}
                    >
                        Register
                    </button>
                    <button
                        onClick={() => setAction("verify")}
                        style={action === "verify" ? styles.activeButton : styles.inactiveButton}
                    >
                        Verify
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <label style={styles.label}>NFT Name:</label>
                    <input
                        type="text"
                        value={nftName}
                        onChange={(e) => setNftName(e.target.value)}
                        style={styles.input}
                        required
                    />

                    <label style={styles.label}>Upload NFT Image:</label>
                    <input type="file" onChange={handleFileChange} style={styles.input} required />

                    <button type="submit" style={styles.submitButton}>
                        {action === "register" ? "Register NFT" : "Verify NFT"}
                    </button>
                </form>

                {registrationResult && (
                    <div style={styles.resultBox}>
                        <h3 style={styles.resultTitle}>Registration Result</h3>
                        {registrationResult.error ? (
                            <p style={styles.errorMessage}>{registrationResult.error}</p>
                        ) : (
                            <div>
                                <p style={styles.successMessage}>{registrationResult.message}</p>
                                <div style={styles.detailsContainer}>
                                    <p>Transaction Hash: {registrationResult.txHash}</p>
                                    <p>NFT Name: {registrationResult.details.name}</p>
                                    <p>pHash: {registrationResult.details.pHash}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Only one verification result block should be present. The following is the correct, detailed block: */}
                {verificationResult && (
                    <div style={styles.resultBox}>
                        <h2 style={styles.resultTitle}>Verification Result</h2>
                        <div style={styles.detailsContainer}>
                            {verificationResult.error ? (
                                <p style={styles.errorMessage}>{verificationResult.error}</p>
                            ) : (
                                <div>
                                    {/* Blockchain Section */}
                                    <div style={styles.verificationSection}>
                                        <div style={styles.sectionTitle}>Blockchain Verification</div>
                                        <ul>
                                            <li><b>Match:</b> {verificationResult.blockchain?.match}</li>
                                            <li><b>Distance:</b> {verificationResult.blockchain?.distance}</li>
                                            <li><b>Threshold:</b> {verificationResult.blockchain?.threshold}</li>
                                            <li><b>Authentic:</b> {verificationResult.blockchain?.isAuthentic ? 'Yes' : 'No'}</li>
                                        </ul>
                                    </div>
                                    {/* AI Model Section */}
                                    <div style={styles.verificationSection}>
                                        <div style={styles.sectionTitle}>AI Model Verification</div>
                                        <ul>
                                            <li><b>Matched:</b> {verificationResult.aiModel?.matched ? 'Yes' : 'No'}</li>
                                            <li><b>Similarity:</b> {verificationResult.aiModel?.similarity !== undefined ? (verificationResult.aiModel.similarity * 100).toFixed(2) + '%' : 'N/A'}</li>
                                        </ul>
                                    </div>
                                    {/* Final Conclusion */}
                                    <div style={styles.finalConclusion}>
                                        <p>{verificationResult.finalConclusion}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(120deg, #89f7fe 0%, #66a6ff 100%)", // gradient background
        padding: "20px",
        color: "white",
    },
    cardBox: {
        backgroundColor: "#3c366b",
        padding: "30px",
        borderRadius: "20px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
        width: "90%",
        maxWidth: "500px",
        border: "2px solid #ffffff33", // subtle border
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    title: {
        fontSize: "24px",
        fontWeight: "bold",
        marginBottom: "20px",
    },
    walletButton: {
        backgroundColor: "#3182ce",
        padding: "10px 20px",
        borderRadius: "8px",
        marginBottom: "20px",
        cursor: "pointer",
        color: "white",
        border: "none",
    },
    actionButtonsContainer: {
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    actionLabel: {
        marginRight: "10px",
        color: "white",
    },
    activeButton: {
        backgroundColor: "#38a169",
        padding: "10px 20px",
        borderRadius: "8px",
        cursor: "pointer",
        color: "white",
        border: "none",
    },
    inactiveButton: {
        backgroundColor: "#4a5568",
        padding: "10px 20px",
        borderRadius: "8px",
        cursor: "pointer",
        color: "white",
        border: "none",
    },
    form: {
        backgroundColor: "#2d3748",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        width: "100%",
        marginBottom: "20px",
    },
    label: {
        display: "block",
        marginBottom: "10px",
        color: "white",
    },
    input: {
        width: "475px",
        padding: "10px",
        marginBottom: "20px",
        backgroundColor: "#edf2f7",
        borderRadius: "8px",
        border: "1px solid #ccc",
        color:"black",
    },
    submitButton: {
        width: "100%",
        padding: "12px",
        backgroundColor: "#3182ce",
        color: "white",
        borderRadius: "8px",
        cursor: "pointer",
        border: "none",
    },
    resultBox: {
        marginTop: "20px",
        color: "white",
        border: "3px solid #ffffff33",
        borderRadius: "15px",
        padding: "20px",
        width: "100%",
        backgroundColor: "#2d3748",
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
    },
    resultTitle: {
        textAlign: "center",
        marginBottom: "15px",
        color: "#38b2ac",
        fontSize: "1.5em",
        borderBottom: "2px solid #38b2ac33",
        paddingBottom: "10px",
    },
    verificationSection: {
        marginTop: "15px",
        padding: "15px",
        backgroundColor: "#1a202c",
        borderRadius: "10px",
        marginBottom: "15px",
    },
    sectionTitle: {
        color: "#38b2ac",
        marginBottom: "10px",
        fontSize: "1.2em",
    },
    detailsContainer: {
        marginTop: "15px",
        color: "#a0aec0",
        backgroundColor: "#1a202c",
        padding: "15px",
        borderRadius: "10px",
        wordBreak: "break-all",
    },
    successMessage: {
        color: "#48bb78",
        textAlign: "center",
        marginBottom: "15px",
        fontSize: "1.1em",
    },
    errorMessage: {
        color: "#f56565",
        textAlign: "center",
        fontSize: "1.1em",
    },
    finalConclusion: {
        marginTop: "20px",
        padding: "15px",
        backgroundColor: "#2c5282",
        borderRadius: "10px",
        textAlign: "center",
    },
};

export default App;
