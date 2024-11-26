'use client'
import { Listbox } from '@headlessui/react';
import { useState } from 'react';

import { getDefaultProvider } from "@sats-connect/core";
import Wallet, { AddressPurpose } from "sats-connect";

import { ethers } from "ethers";

import abi_BitcoinAccount from "./config/abi_BitcoinAccount.json";
import abi_BitcoinFactory from "./config/abi_BitcoinFactory.json";
import abi_EntryPoint from "./config/abi_EntryPoint.json";
import abi_Test from "./config/abi_Test.json";

import { address_BitcoinFactory, address_EntryPoint, address_Test, chainId, deployer, provider } from "./config/config";
import { fillAndPack, fillUserOp, getObjectFieldValue, getUserOpHash } from "./utils/utils";

export default function Home() {

	interface IWalletAccount {
		address: string;
		publicKey: string;
		addressType: string;
	}

	interface ISatsAddress {
		address: string;
		publicKey: string;
		purpose: string;
		addressType: string;
	}

	//Connect contracts
	const contract_EntryPoint = new ethers.Contract(address_EntryPoint, abi_EntryPoint, provider);
	const contract_BitcoinFactory = new ethers.Contract(address_BitcoinFactory, abi_BitcoinFactory, provider);
	const contract_Test = new ethers.Contract(address_Test, abi_Test, provider);

	//State variables
	const [pageStatus, setPageStatus] = useState("Loaded");
	const [connected, setConnected] = useState(false);
	const [chainAddress, setChainAddress] = useState("N/A");
	const [chainAccount, setChainAccount] = useState("N/A");
	const [balanceEntryPoint, setBalanceEntryPoint] = useState("N/A");
	const [balanceNative, setBalanceNative] = useState("N/A");
	const [fundingStatus, setFundingStatus] = useState("N/A");
	const [testValue, setTestValue] = useState(100);
	const [testStatus, setTestStatus] = useState("N/A");

	const [label, setLabel] = useState('Connect');
	const [signWithAccount, setSignWithAccount] = useState<IWalletAccount>();
	const [accounts, setAccounts] = useState<IWalletAccount[]>([]);

	const handleConnectClick = async () => {
		//Init defaults 
		setChainAddress("N/A")
		setChainAccount("N/A")
		setBalanceEntryPoint("N/A")
		setBalanceNative("N/A")
		setFundingStatus("N/A")
		setTestStatus("N/A")

		if (!connected) {
			try {
				const response = await Wallet.request("getAccounts", {
					purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
				});
				if (String(getObjectFieldValue(response, "status")) === "success") {
					const selectedWallet = await getDefaultProvider();
					const responseAddresses = getObjectFieldValue(response, "result");
					let lastAddress: string = "";
					let walletAccounts: IWalletAccount[] = [];
					for (let i = 0; i < responseAddresses.length; i++) {
						const responseAddress: ISatsAddress = responseAddresses[i];
						if (responseAddress.address != lastAddress) {
							lastAddress = responseAddress.address;
							const currentAccount: IWalletAccount = {
								address: responseAddress.address,
								addressType: responseAddress.addressType,
								publicKey: responseAddress.publicKey,
							};
							walletAccounts.push(currentAccount);
						}
					}
					setAccounts(walletAccounts);
					setSignWithAccount(walletAccounts[0]);
					setConnected(true);
					setLabel("Disconnect");
				} else {
					const responseError = getObjectFieldValue(response, "error");
					console.error("Wallet NOT Connected"); (
						"Error connecting wallet " +
						String(getObjectFieldValue(responseError, "message")),
						"error"
					);
				}
			} catch (err) {
				console.error("Wallet NOT Connected"); (
					"Error connecting wallet " +
					String(getObjectFieldValue(err, "message")),
					"error"
				);
			}
		} else {
			Wallet.disconnect();
			setConnected(false);
			setLabel("Connect");
		}
	};

	const handleCheckAddressClick = async () => {
		setPageStatus("Loading ... ")
		if (signWithAccount) {
			const addressBytes = ethers.utils.toUtf8Bytes(signWithAccount.address);
			// console.log("addressBytes:", addressBytes);
			var futureAddress = await contract_BitcoinFactory.getAddress(addressBytes, 0);
			// console.log(`futureAddress: ${futureAddress}`);
			setChainAddress(futureAddress)
		}
		setPageStatus("Loaded")
	}

	const handleCreateAccountClick = async () => {
		setPageStatus("Loading ... ")
		if (signWithAccount) {
			const addressBytes = ethers.utils.toUtf8Bytes(signWithAccount.address);
			// console.log("addressBytes:", addressBytes);
			const txCreateAccount = await contract_BitcoinFactory.connect(deployer).createAccount(addressBytes, 0, { gasLimit: 30000000 });
			const txCreateAccountReceipt = await txCreateAccount.wait();
			// console.log("txCreateAccountReceipt.status:", txCreateAccountReceipt.status);
			if (txCreateAccountReceipt.status == 1) {
				setChainAccount(chainAddress)
				// console.log("acc created:", chainAddress, signWithAccount.address);
			} else {
				setChainAccount("N/A")
				// console.log("acc create failed:", signWithAccount.address);
			}
		}
		setPageStatus("Loaded")
	}

	const handleCheckBalancesClick = async () => {
		setPageStatus("Loading ... ")
		if (chainAccount != "N/A") {
			const deposited = await contract_EntryPoint.balanceOf(chainAccount);
			const balanceWei = await provider.getBalance(chainAccount);
			const depositedString = ethers.BigNumber.from(deposited).toString();
			const nativeString = ethers.BigNumber.from(balanceWei).toString();
			setBalanceEntryPoint(depositedString)
			setBalanceNative(nativeString)
		}
		setPageStatus("Loaded")
	}

	const handleFundAccountClick = async () => {
		setPageStatus("Loading ... ")
		if (chainAccount != "N/A") {
			const txFundEntryPoint = await contract_EntryPoint.connect(deployer).depositTo(chainAccount, {
				gasLimit: 9999999,
				value: 5000000000000000
			});
			const receiptTxFundEntryPoint = await txFundEntryPoint.wait();
			console.log("receiptTxFundEntryPoint.status", receiptTxFundEntryPoint.status);
			setFundingStatus("Funded ... check balance!")
		}
		setPageStatus("Loaded")
	}

	const handleResetClick = async () => {
		setChainAddress("N/A")
		setChainAccount("N/A")
		setBalanceEntryPoint("N/A")
		setBalanceNative("N/A")
		setFundingStatus("N/A")
		setTestStatus("N/A")
	}

	const handleSignClick = async () => {
		setPageStatus("Loading ... ")
		if (signWithAccount) {
			const bitcoinAccountInterface = new ethers.utils.Interface(abi_BitcoinAccount);
			const accountCallData = contract_Test.interface.encodeFunctionData('setAccountBalance', [testValue])
			// console.log("accountCallData:", accountCallData);
			const callData = bitcoinAccountInterface.encodeFunctionData('execute', [address_Test, 0, accountCallData])
			// console.log("callData:", callData);
			const uop = {
				sender: chainAccount,
				callData: callData,
				// initCode: initCode,
				// callGasLimit: 1e6,
				verificationGasLimit: 3e6,
				// nonce: 0
			}
			const puop = await fillAndPack(uop, contract_EntryPoint);
			// console.log("puop:", puop);
			const dataHashLocal = getUserOpHash(await fillUserOp(uop, contract_EntryPoint), contract_EntryPoint!.address, chainId);
			// console.log("dataHashLocal: ", dataHashLocal);
			const dataHashLocalBytes = Buffer.from(dataHashLocal.slice(2), "hex");
			// console.log("dataHashLocalBytes: ", dataHashLocalBytes);
			const dataHashLocalBase64 = ethers.utils.base64.encode(dataHashLocalBytes);
			// console.log("dataHashLocalBase64: ", dataHashLocalBase64);
			const response = await Wallet.request("signMessage", {
				address: signWithAccount.address,
				message: dataHashLocalBase64,
			});
			if (String(getObjectFieldValue(response, "status")) === 'success') {
				const responseSignature = getObjectFieldValue(response, "result");
				const signature = getObjectFieldValue(responseSignature, "signature");
				// console.log("signature", signature);
				const sigBytes = ethers.utils.base64.decode(signature);
				// console.log("sigBytes", sigBytes);
				puop.signature = ethers.utils.hexlify(ethers.utils.base64.decode(signature));
				// console.log("puop:", puop);
				try {
					// Get transaction options (such as gas and signer)
					const tx = await contract_EntryPoint.connect(deployer).handleOps([puop], deployer.getAddress(), { gasLimit: 30000000, });
					// console.log("Transaction:", tx);
					const receipt = await tx.wait();
					// console.log("Transaction receipt:", receipt);
					// viewTestSetLogs(receipt)
				} catch (err) {
					// console.log("err.handleOps", err);
				}
				const test_accountBalance = await contract_Test.getAccountBalance(); // Call the getAccountBalance() function
				// console.log(`Test value is: ${test_accountBalance}`);
				if (test_accountBalance == testValue) {
					setTestStatus("Success " + test_accountBalance);
				} else {
					setTestStatus("Failed " + test_accountBalance);
				}

			} else {
				const responseError = getObjectFieldValue(response, "error")
				console.log("responseError", responseError);
			}
		} else {
			console.log("You have not defined a signing address! Connect your wallet first!");
		}
		setPageStatus("Loaded")
	};

	return (
		<div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center p-8 pb-20 font-[family-name:var(--font-geist-sans)]">
			<main className="flex flex-col gap-4 row-start-2 items-center">
				<div className="flex items-center flex-col">
					<p>Status: {pageStatus}</p>
				</div>
				<div className="flex items-center flex-col">
					<button onClick={handleConnectClick} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800"> {label} </button>
				</div>
				{connected == true &&
					<div className="flex items-center flex-col">
						<Listbox value={signWithAccount} onChange={setSignWithAccount}>
							<div className="relative">
								<Listbox.Button className="w-full bg-white text-black py-2 px-4 border rounded-md shadow-md cursor-pointer">
									{signWithAccount?.address} ({signWithAccount?.addressType})
								</Listbox.Button>
								<Listbox.Options className="absolute w-full bg-white border rounded-md shadow-lg mt-2 max-h-60 overflow-auto">
									{accounts.map((account) => (
										<Listbox.Option
											key={account.address}
											value={account}
											className={({ active }) =>
												`cursor-pointer select-none py-2 px-4 ${active ? 'bg-blue-500 text-white' : 'text-black'
												}`
											}
										>
											{account.address} ({account.addressType})
										</Listbox.Option>
									))}
								</Listbox.Options>
							</div>
						</Listbox>
					</div>
				}
				{connected == true &&
					<>
						<div className="flex items-center flex-col">
							<button onClick={handleCheckAddressClick} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800"> Check Chain Allocated Address </button>
						</div>
						<div className="flex items-center flex-col">
							<p>Future chain related account address: <b>{chainAddress}</b></p>
						</div>
					</>
				}
				{connected == true && chainAddress != "N/A" &&
					<>
						<div className="flex items-center flex-col">
							<button onClick={handleCreateAccountClick} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800"> Create Account </button>
						</div>
						<div className="flex items-center flex-col">
							<p>Account created with address: <b>{chainAccount}</b></p>
						</div>
					</>
				}
				{connected == true && chainAddress != "N/A" && chainAccount != "N/A" &&
					<>
						<div className="flex items-center flex-col">
							<button onClick={handleCheckBalancesClick} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800"> Check Account Balances </button>
						</div>
						<div className="flex items-center flex-col">
							<p>EntryPoint balance: <b>{balanceEntryPoint}</b>, Native balance: <b>{balanceNative}</b></p>
						</div>
					</>
				}
				{connected == true && chainAddress != "N/A" && chainAccount != "N/A" && balanceEntryPoint != "N/A" && balanceNative != "N/A" &&
					<>
						<div className="flex items-center flex-col">
							<button onClick={handleFundAccountClick} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800"> Fund Account </button>
						</div>
						<div className="flex items-center flex-col">
							<p>Funding status: {fundingStatus}</p>
						</div>
					</>
				}
				{connected == true && chainAddress != "N/A" && chainAccount != "N/A" && balanceEntryPoint != "N/A" && balanceEntryPoint != "0" && balanceNative != "N/A" &&
					<>
						<div className="flex items-center flex-col">
							<Listbox value={testValue} onChange={setTestValue}>
								<div className="relative">
									<Listbox.Button className="w-full bg-white text-black py-2 px-4 border rounded-md shadow-md cursor-pointer">
										{testValue}
									</Listbox.Button>
									<Listbox.Options className="absolute w-full bg-white border rounded-md shadow-lg mt-2 max-h-60 overflow-auto">
										<Listbox.Option
											key={1}
											value={100}
											className={({ active }) =>
												`cursor-pointer select-none py-2 px-4 ${active ? 'bg-blue-500 text-white' : 'text-black'
												}`
											}
										>
											{100}
										</Listbox.Option>
										<Listbox.Option
											key={2}
											value={200}
											className={({ active }) =>
												`cursor-pointer select-none py-2 px-4 ${active ? 'bg-blue-500 text-white' : 'text-black'
												}`
											}
										>
											{200}
										</Listbox.Option>
										<Listbox.Option
											key={3}
											value={300}
											className={({ active }) =>
												`cursor-pointer select-none py-2 px-4 ${active ? 'bg-blue-500 text-white' : 'text-black'
												}`
											}
										>
											{300}
										</Listbox.Option>
									</Listbox.Options>
								</div>
							</Listbox>
						</div>
						<div className="flex items-center flex-col">
							<button onClick={handleSignClick} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800"> Write Test </button>
						</div>
						<div className="flex items-center flex-col">
							<p>Test status: {testStatus}</p>
						</div>
					</>
				}

				{connected == true &&
					<>
						<div className="flex items-center flex-col">
							<button onClick={handleResetClick} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800"> Reset </button>
						</div>
					</>
				}
			</main>
		</div>
	);
}

