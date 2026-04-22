from pyteal import *
 
"""
AlgoVote - Decentralised Voting Smart Contract
Built on Algorand using PyTeal.
 
Extends the CN6035 Week 9 song voting tutorial into a generalised,
dynamic, multi-candidate voting platform.
 
Global State:
    - Creator     (bytes)  : address of the election creator
    - RegBegin    (uint64) : first round of registration window
    - RegEnd      (uint64) : last round of registration window
    - VoteBegin   (uint64) : first round of voting window
    - VoteEnd     (uint64) : last round of voting window
    - <candidate> (uint64) : vote tally per candidate (dynamic keys)
 
Local State:
    - voted       (bytes)  : the candidate this account voted for
"""
 
 
def approval_program():
 
    # ── On Creation ──────────────────────────────────────────────────────────
    # Store the creator and the four round-based time windows.
    # Requires exactly 4 application arguments: RegBegin, RegEnd, VoteBegin, VoteEnd
    on_creation = Seq(
        [
            App.globalPut(Bytes("Creator"), Txn.sender()),
            Assert(Txn.application_args.length() == Int(4)),
            App.globalPut(Bytes("RegBegin"), Btoi(Txn.application_args[0])),
            App.globalPut(Bytes("RegEnd"), Btoi(Txn.application_args[1])),
            App.globalPut(Bytes("VoteBegin"), Btoi(Txn.application_args[2])),
            App.globalPut(Bytes("VoteEnd"), Btoi(Txn.application_args[3])),
            Return(Int(1)),
        ]
    )
 
    # ── Access Control ───────────────────────────────────────────────────────
    is_creator = Txn.sender() == App.globalGet(Bytes("Creator"))
 
    # ── Local State Lookup ───────────────────────────────────────────────────
    # Check if the sender has already voted (stored in local state)
    get_vote_of_sender = App.localGetEx(Int(0), App.id(), Bytes("voted"))
 
    # ── On Close Out ─────────────────────────────────────────────────────────
    # Graceful exit: if the user voted and voting is still open,
    # decrement their candidate's tally before removing local state.
    on_closeout = Seq(
        [
            get_vote_of_sender,
            If(
                And(
                    Global.round() <= App.globalGet(Bytes("VoteEnd")),
                    get_vote_of_sender.hasValue(),
                ),
                App.globalPut(
                    get_vote_of_sender.value(),
                    App.globalGet(get_vote_of_sender.value()) - Int(1),
                ),
            ),
            Return(Int(1)),
        ]
    )
 
    # ── On Register (OptIn) ───────────────────────────────────────────────────
    # FIX: Original used <= for RegBegin (checked round hadn't passed the start).
    # Corrected to >= so the round must be within [RegBegin, RegEnd].
    on_register = Return(
        And(
            Global.round() >= App.globalGet(Bytes("RegBegin")),
            Global.round() <= App.globalGet(Bytes("RegEnd")),
        )
    )
 
    # ── On Vote (NoOp) ───────────────────────────────────────────────────────
    # Application args: [0] = "vote", [1] = candidate name (dynamic)
    choice = Txn.application_args[1]
    choice_tally = App.globalGet(choice)
 
    on_vote = Seq(
        [
            # Ensure voting window is open
            Assert(
                And(
                    Global.round() >= App.globalGet(Bytes("VoteBegin")),
                    Global.round() <= App.globalGet(Bytes("VoteEnd")),
                )
            ),
            # Check if sender has already voted
            get_vote_of_sender,
            If(get_vote_of_sender.hasValue(), Return(Int(0))),
            # Increment candidate tally and record vote in local state
            App.globalPut(choice, choice_tally + Int(1)),
            App.localPut(Int(0), Bytes("voted"), choice),
            Return(Int(1)),
        ]
    )
 
    # ── Program Router ────────────────────────────────────────────────────────
    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(is_creator)],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(is_creator)],
        [Txn.on_completion() == OnComplete.CloseOut, on_closeout],
        [Txn.on_completion() == OnComplete.OptIn, on_register],
        [Txn.application_args[0] == Bytes("vote"), on_vote],
    )
 
    return program
 
 
def clear_state_program():
    """
    Clear State Program — forced exit path.
 
    If the user had voted and voting is still active,
    their vote is removed from the global tally to preserve integrity.
    Always returns 1 (clear state must always succeed per AVM spec).
    """
    get_vote_of_sender = App.localGetEx(Int(0), App.id(), Bytes("voted"))
 
    program = Seq(
        [
            get_vote_of_sender,
            If(
                And(
                    Global.round() <= App.globalGet(Bytes("VoteEnd")),
                    get_vote_of_sender.hasValue(),
                ),
                App.globalPut(
                    get_vote_of_sender.value(),
                    App.globalGet(get_vote_of_sender.value()) - Int(1),
                ),
            ),
            Return(Int(1)),
        ]
    )
 
    return program
 
 
if __name__ == "__main__":
    import os
 
    artifacts_path = os.path.join(os.path.dirname(__file__), "artifacts")
    os.makedirs(artifacts_path, exist_ok=True)
 
    with open(os.path.join(artifacts_path, "vote_approval.teal"), "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=5)
        f.write(compiled)
        print("✓ vote_approval.teal compiled")
 
    with open(os.path.join(artifacts_path, "vote_clear_state.teal"), "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=5)
        f.write(compiled)
        print("✓ vote_clear_state.teal compiled")
 
    print("\nCompilation complete. Artifacts saved to:", artifacts_path)
