// Deploy the election contract
  // const appId = await createApp(
  //   creatorAccount.addr,
  //   approvalBinary,
  //   clearBinary,
  //   [regBegin, regEnd, voteBegin, voteEnd]
  // );
 
  // After deployment, use the returned appId for subsequent calls:
  // await optIn(getUserAccount().addr, appId);
  // await castVote(getUserAccount().addr, appId, "Candidate Name");
  // await readGlobalState(appId);
  // await closeOut(getUserAccount().addr, appId);
  // await deleteApp(creatorAccount.addr, appId);
};
 
main().catch(console.error);
 
export {
  createApp,
  optIn,
  castVote,
  readGlobalState,
  closeOut,
  deleteApp,
  compileProgram,
  client,
};
 
