const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("NFTAuthModule", (m) => {
  const nftAuth = m.contract("NFTAuth");
  return { nftAuth };
});
