import { ethers } from "ethers";

export const chainId = 73405;
export const provider = new ethers.providers.JsonRpcProvider("https://rpc.supernova.zenon.red");

// 0x90C24A7C698B2Ff91B68B92cb95968EB6275597D
export const deployer = ethers.Wallet.fromMnemonic("hood focus chest license repair vocal avocado above into vicious silent exit").connect(provider); 

// Contract addresses
export const address_EntryPoint = "0x4f5aD4CBc8F6F21bd6Ecd0E37d844f7a4CDBA87A"
export const address_BitcoinFactory = "0x9892B065db43CF67f027b7b22f716C66a61706DD"
export const address_Test = "0x319B86eb05A3210646Dc014e23F5d73ffcC8A996"
