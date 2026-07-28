// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract InterPredict is AccessControl, ReentrancyGuard, Pausable {
    bytes32 constant TEAM_ROLE = keccak256("TEAM_MARKET_ROLE");
    bytes32 constant DEC_ROLE = keccak256("DEC_ROLE");
    bytes32 constant ADMIN_ROLE = keccak256("ADMIN_VERIFIER_ROLE");
    bytes32 constant PAUSE_ROLE = keccak256("PAUSER_ROLE");
    enum Origin {
        Community,
        Team
    }
    enum Category {
        Sports,
        Politics,
        Crypto,
        Blockchain,
        Technology,
        AI,
        Economics,
        Finance,
        Business,
        Science,
        Climate,
        Entertainment,
        Culture,
        Health,
        RealEstate,
        Gaming,
        Web3,
        Other
    }
    enum State {
        Proposed,
        DECVoting,
        Rejected,
        Cancelled,
        Approved,
        Active,
        Closed,
        Unresolved,
        ResReq,
        DECResVoting,
        AdminVer,
        Confirmed,
        Finalized,
        Resolved
    }
    enum PVote {
        None,
        Approve,
        Reject
    }

    uint256 constant FEE1 = 1 ether;
    uint256 constant SEED = 10 ether;
    uint256 constant COST11 = 11 ether;
    uint256 constant DAY = 24 hours;
    uint256 constant H3 = 3 hours;
    uint256 constant FEE_BPS = 50;
    uint256 constant CTREAS = 20;
    uint256 constant CDEC = 20;
    uint256 constant CCREA = 10;
    uint256 constant TTREAS = 30;
    uint256 constant TDEC = 20;
    uint256 constant SETTLE = 500;
    uint256 constant STREAS = 200;
    uint256 constant SDEC = 200;
    uint256 constant SCREA = 100;
    uint256 constant TSTREAS = 300;
    uint256 constant TSDEC = 200;
    uint256 constant MINTR = 0.001 ether;
    uint256 constant ML = 64;
    uint256 constant MQ = 256;
    uint256 constant IR = 100;
    uint256 constant RI = 10;
    uint256 constant RD = 20;
    uint256 constant QRM = 500;

    struct MCtx {
        string q;
        string d;
        Category cat;
        string cc;
        string tu;
        Origin o;
        address cr;
        uint256 et;
        string rc;
        string pe;
        string be;
    }
    struct MV {
        uint256 pvs;
        uint256 pvd;
        uint256 apv;
        uint256 rjv;
        bool pf;
        PVote pd;
        uint256 pft;
        uint256 ra;
        address rr;
        bool rc;
    }
    struct MR {
        uint256 snap;
        uint256 quorum;
        uint256 trv;
        uint8 co;
        bool oc;
        bool fin;
    }
    struct MF {
        uint256 tv;
        uint256 pc;
        uint256 cfe;
        uint256 cfc;
        uint256 csc;
        bool can;
        string cr;
        uint256 ct;
    }
    struct DM {
        bool act;
        uint256 pv;
        uint256 rv;
        uint256 tp;
        uint256 hv;
        uint256 iv;
        uint256 rep;
        uint256 tre;
        uint256 trc;
        uint256 ur;
    }

    address payable public treasury;
    uint256 public tm;
    uint256 public drp;
    uint256 public tdm;
    uint256 public drt;
    address[] public dml;
    mapping(uint256 => MCtx) public mb;
    mapping(uint256 => MV) public mv;
    mapping(uint256 => MR) public mr;
    mapping(uint256 => MF) public mf;
    mapping(uint256 => State) public ms;
    mapping(uint256 => string[]) public ol;
    mapping(uint256 => uint256[]) public op;
    mapping(uint256 => uint256[]) public csp;
    mapping(uint256 => uint256[]) public rvc;
    mapping(uint256 => mapping(address => bool)) public hvp;
    mapping(uint256 => mapping(address => PVote)) public pv;
    mapping(uint256 => mapping(address => bool)) public hvr;
    mapping(uint256 => mapping(address => uint8)) public rv;
    mapping(uint256 => mapping(address => bool)) public ht;
    mapping(uint256 => mapping(uint8 => mapping(address => uint256))) public sh;
    mapping(uint256 => mapping(address => bool)) public hcw;
    mapping(address => DM) public dm;
    mapping(uint256 => mapping(address => bool)) public dvp;

    event MP(uint256 id, string q, Category cat, Origin o, address cr);
    event MEV(uint256 id, uint256 dl);
    event PVC(uint256 id, address v, PVote vote);
    event PF(uint256 id, PVote d, uint256 ts);
    event PA(uint256 id);
    event MA(uint256 id);
    event PR(uint256 id, string r);
    event PC(uint256 id, string r);
    event AR(uint256 id, address r, uint256 a);
    event TMC(uint256 id, string q, address cr);
    event TMA(uint256 id);
    event SP(
        uint256 id,
        address b,
        uint8 oi,
        uint256 g,
        uint256 n,
        uint256 s,
        uint256 f
    );
    event RR(uint256 id, address r, uint256 dl);
    event RVC(uint256 id, address v, uint8 oi);
    event RVF(uint256 id, bool q, uint8 w);
    event NQ(uint256 id);
    event TR(uint256 id);
    event OC(uint256 id, uint8 oi);
    event MFNL(uint256 id);
    event WC(uint256 id, address c, uint256 a);
    event CFC(uint256 id, address cr, uint256 a);
    event CSC(uint256 id, address cr, uint256 a);
    event MCAN(uint256 id, string r);
    event DMA(address m);
    event DMR(address m);
    event DMACT(address m);
    event DMSUS(address m);
    event DRC(address m, uint256 a);
    event RU(address m, uint256 rep);
    event TU(address old, address nw);

    modifier me(uint256 id) {
        require(id < tm, "!e");
        _;
    }
    modifier adec() {
        require(hasRole(DEC_ROLE, msg.sender) && dm[msg.sender].act, "!d");
        _;
    }

    constructor(address payable _t, address _a) {
        treasury = _t;
        drt = 50;
        _grantRole(DEFAULT_ADMIN_ROLE, _a);
        _grantRole(ADMIN_ROLE, _a);
        _grantRole(PAUSE_ROLE, _a);
    }

    function ut(address payable _n) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit TU(treasury, _n);
        treasury = _n;
    }

    function udrt(uint256 _n) external onlyRole(DEFAULT_ADMIN_ROLE) {
        drt = _n;
    }

    function pause() external onlyRole(PAUSE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSE_ROLE) {
        _unpause();
    }

    function addD(address _m) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!hasRole(DEC_ROLE, _m), "a");
        _grantRole(DEC_ROLE, _m);
        dm[_m] = DM(true, 0, 0, 0, 0, 0, IR, 0, 0, 0);
        dml.push(_m);
        tdm++;
        emit DMA(_m);
    }

    function remD(address _m) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRole(DEC_ROLE, _m), "!");
        _revokeRole(DEC_ROLE, _m);
        dm[_m].act = false;
        emit DMR(_m);
    }

    function actD(address _m) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRole(DEC_ROLE, _m), "!");
        dm[_m].act = true;
        emit DMACT(_m);
    }

    function susD(address _m) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRole(DEC_ROLE, _m), "!");
        dm[_m].act = false;
        emit DMSUS(_m);
    }

    function iad(address _m) public view returns (bool) {
        return hasRole(DEC_ROLE, _m) && dm[_m].act;
    }

    function gAD() external view returns (address[] memory) {
        return dml;
    }

    function gADC() public view returns (uint256) {
        uint256 c;
        for (uint256 i; i < dml.length; i++) if (iad(dml[i])) c++;
        return c;
    }

    function vOut(string[] calldata l) internal pure {
        uint256 n = l.length;
        require(n >= 2 && n <= 4, "!c");
        for (uint256 i; i < n; i++) {
            require(bytes(l[i]).length > 0 && bytes(l[i]).length <= ML, "!l");
            for (uint256 j = i + 1; j < n; j++)
                require(keccak256(bytes(l[i])) != keccak256(bytes(l[j])), "d");
        }
    }

    struct MCParams {
        string q;
        string d;
        Category cat;
        string cc;
        string tu;
        string[] ol;
        uint256 et;
        string rc;
        string ev;
        string pe;
    }

    function cTM(
        MCParams calldata p
    ) external payable onlyRole(TEAM_ROLE) whenNotPaused returns (uint256) {
        require(bytes(p.q).length > 0 && bytes(p.q).length <= MQ, "!q");
        require(p.et > block.timestamp, "!t");
        require(bytes(p.tu).length <= 256 && bytes(p.rc).length > 0, "!p");
        require(msg.value >= SEED, "!s");
        vOut(p.ol);
        uint256 id = tm++;
        mb[id] = MCtx(
            p.q,
            p.d,
            p.cat,
            p.cc,
            p.tu,
            Origin.Team,
            msg.sender,
            p.et,
            p.rc,
            p.ev,
            p.pe
        );
        op[id] = new uint256[](p.ol.length);
        csp[id] = new uint256[](p.ol.length);
        rvc[id] = new uint256[](p.ol.length);
        ol[id] = p.ol;
        ms[id] = State.Active;
        _as(id, msg.value);
        emit TMC(id, p.q, msg.sender);
        emit TMA(id);
        emit MA(id);
        return id;
    }

    function pM(
        MCParams calldata p
    ) external payable whenNotPaused returns (uint256) {
        require(bytes(p.q).length > 0 && bytes(p.q).length <= MQ, "!q");
        require(msg.value == COST11, "!11");
        require(
            p.et > block.timestamp + DAY &&
                bytes(p.tu).length <= 256 &&
                bytes(p.rc).length > 0,
            "!p"
        );
        if (p.cat == Category.Other)
            require(bytes(p.cc).length > 0 && bytes(p.cc).length <= 32, "!o");
        vOut(p.ol);
        (bool fs, ) = treasury.call{value: FEE1}("");
        require(fs, "!f");
        uint256 id = tm++;
        mb[id] = MCtx(
            p.q,
            p.d,
            p.cat,
            p.cc,
            p.tu,
            Origin.Community,
            msg.sender,
            p.et,
            p.rc,
            p.ev,
            p.pe
        );
        op[id] = new uint256[](p.ol.length);
        csp[id] = new uint256[](p.ol.length);
        rvc[id] = new uint256[](p.ol.length);
        ol[id] = p.ol;
        ms[id] = State.Proposed;
        mv[id] = MV(0, 0, 0, 0, false, PVote.None, 0, SEED, msg.sender, false);
        emit MP(id, p.q, p.cat, Origin.Community, msg.sender);
        return id;
    }

    function ePV(uint256 id) external me(id) {
        require(ms[id] == State.Proposed && mb[id].o == Origin.Community, "!");
        ms[id] = State.DECVoting;
        MV storage v = mv[id];
        v.pvs = block.timestamp;
        v.pvd = block.timestamp + DAY;
        emit MEV(id, v.pvd);
    }

    function vOP(uint256 id, PVote vote) external adec me(id) {
        require(vote == PVote.Approve || vote == PVote.Reject, "!v");
        MV storage v = mv[id];
        require(
            ms[id] == State.DECVoting &&
                block.timestamp < v.pvd &&
                !hvp[id][msg.sender] &&
                mb[id].o == Origin.Community,
            "!"
        );
        hvp[id][msg.sender] = true;
        pv[id][msg.sender] = vote;
        if (vote == PVote.Approve) v.apv++;
        else v.rjv++;
        dm[msg.sender].pv++;
        dm[msg.sender].tp++;
        emit PVC(id, msg.sender, vote);
    }

    function fPV(uint256 id) external me(id) nonReentrant {
        MV storage v = mv[id];
        require(
            ms[id] == State.DECVoting && block.timestamp >= v.pvd && !v.pf,
            "!"
        );
        v.pf = true;
        v.pft = block.timestamp;
        uint256 tot = v.apv + v.rjv;
        if (tot == 0) {
            ms[id] = State.Cancelled;
            v.pd = PVote.None;
            _ref(id);
            emit PC(id, "NoDECVotes");
        } else if (v.apv > v.rjv) {
            ms[id] = State.Approved;
            v.pd = PVote.Approve;
            _act(id);
            emit PA(id);
        } else {
            ms[id] = State.Rejected;
            v.pd = PVote.Reject;
            _ref(id);
            emit PR(id, v.apv == v.rjv ? "Tied" : "Rejected");
        }
        emit PF(id, v.pd, block.timestamp);
    }

    function _ref(uint256 id) internal {
        MV storage v = mv[id];
        require(!v.rc, "!");
        v.rc = true;
        (bool s, ) = payable(v.rr).call{value: v.ra}("");
        require(s, "!");
        emit AR(id, v.rr, v.ra);
    }

    function _act(uint256 id) internal {
        require(mb[id].et > block.timestamp, "!");
        ms[id] = State.Active;
        _as(id, SEED);
        emit MA(id);
    }

    function _as(uint256 id, uint256 total) internal {
        uint256 n = ol[id].length;
        uint256 base = total / n;
        uint256 rem = total - (base * n);
        for (uint256 i; i < n; i++) {
            uint256 a = base;
            if (i == 0) a += rem;
            csp[id][i] = a;
            op[id][i] += a;
        }
    }

    function gTP(uint256 id) public view returns (uint256) {
        uint256 t;
        uint256[] memory p = op[id];
        for (uint256 i; i < p.length; i++) t += p[i];
        return t;
    }

    function gPr(uint256 id, uint8 oi) public view returns (uint256) {
        require(oi < ol[id].length, "!");
        uint256 tp = gTP(id);
        return tp == 0 ? 0 : (op[id][oi] * 1e18) / tp;
    }

    function gSO(
        uint256 id,
        uint8 oi,
        uint256 net
    ) public view returns (uint256) {
        require(oi < ol[id].length, "!");
        uint256 tp = gTP(id);
        if (tp == 0) return net;
        uint256 po = op[id][oi];
        return po == 0 ? net : (net * tp) / po;
    }

    function bO(
        uint256 id,
        uint8 oi,
        uint256 minSh
    ) external payable whenNotPaused nonReentrant {
        require(
            ms[id] == State.Active &&
                block.timestamp < mb[id].et &&
                oi < ol[id].length &&
                msg.value >= MINTR,
            "!"
        );
        uint256 fee = (msg.value * FEE_BPS) / 10000;
        uint256 net = msg.value - fee;
        uint256 sO = gSO(id, oi, net);
        require(sO >= minSh, "s");
        op[id][oi] += net;
        sh[id][oi][msg.sender] += sO;
        if (!ht[id][msg.sender]) {
            ht[id][msg.sender] = true;
            mf[id].pc++;
        }
        mf[id].tv += msg.value;
        _dF(id, fee);
        emit SP(id, msg.sender, oi, msg.value, net, sO, fee);
    }

    function _dF(uint256 id, uint256 fee) internal {
        if (mb[id].o == Origin.Community) {
            uint256 ts = (fee * CTREAS) / FEE_BPS;
            uint256 ds = (fee * CDEC) / FEE_BPS;
            uint256 cs = fee - ts - ds;
            (bool s, ) = treasury.call{value: ts}("");
            require(s, "!");
            drp += ds;
            mf[id].cfe += cs;
        } else {
            uint256 ts = (fee * TTREAS) / FEE_BPS;
            uint256 ds = fee - ts;
            (bool s, ) = treasury.call{value: ts}("");
            require(s, "!");
            drp += ds;
        }
    }

    function rR(uint256 id) external me(id) {
        State s = ms[id];
        require(
            (s == State.Active || s == State.Closed || s == State.Unresolved) &&
                block.timestamp >= mb[id].et,
            "!"
        );
        require(
            s != State.Finalized &&
                s != State.Resolved &&
                s != State.Cancelled &&
                s != State.Rejected,
            "!"
        );
        bool tr = ht[id][msg.sender];
        bool cr = mb[id].cr == msg.sender;
        bool dec = iad(msg.sender);
        require(tr || cr || dec, "!");
        ms[id] = State.DECResVoting;
        MR storage r = mr[id];
        r.snap = gADC();
        r.quorum = (r.snap * QRM) / 10000;
        if (r.quorum == 0 && r.snap > 0) r.quorum = 1;
        emit RR(id, msg.sender, block.timestamp + H3);
    }

    function vOR(uint256 id, uint8 oi) external adec me(id) {
        MR storage r = mr[id];
        require(
            ms[id] == State.DECResVoting &&
                oi < ol[id].length &&
                !hvr[id][msg.sender],
            "!"
        );
        hvr[id][msg.sender] = true;
        rv[id][msg.sender] = oi;
        rvc[id][oi]++;
        r.trv++;
        dm[msg.sender].rv++;
        dm[msg.sender].tp++;
        emit RVC(id, msg.sender, oi);
    }

    function fRV(uint256 id) external me(id) {
        MR storage r = mr[id];
        require(ms[id] == State.DECResVoting, "!");
        if (r.trv < r.quorum) {
            ms[id] = State.AdminVer;
            emit NQ(id);
            emit RVF(id, false, 0);
            return;
        }
        uint8 win;
        uint256 hv;
        bool tied;
        uint256[] memory votes = rvc[id];
        for (uint8 i; i < votes.length; i++) {
            if (votes[i] > hv) {
                hv = votes[i];
                win = i;
                tied = false;
            } else if (votes[i] == hv && hv > 0) tied = true;
        }
        if (tied) {
            ms[id] = State.AdminVer;
            emit TR(id);
            emit RVF(id, true, win);
            return;
        }
        ms[id] = State.AdminVer;
        emit RVF(id, true, win);
    }

    function cO(
        uint256 id,
        uint8 oi,
        string calldata
    ) external onlyRole(ADMIN_ROLE) me(id) {
        require(
            ms[id] == State.AdminVer && oi < ol[id].length && !mr[id].oc,
            "!"
        );
        MR storage r = mr[id];
        r.co = oi;
        r.oc = true;
        ms[id] = State.Confirmed;
        emit OC(id, oi);
        for (uint256 i; i < dml.length; i++) {
            address m = dml[i];
            if (hvr[id][m] && !dvp[id][m]) {
                dvp[id][m] = true;
                if (rv[id][m] == oi) {
                    dm[m].hv++;
                    dm[m].rep = dm[m].rep + RI > 1000 ? 1000 : dm[m].rep + RI;
                } else {
                    dm[m].iv++;
                    dm[m].rep = dm[m].rep > RD ? dm[m].rep - RD : 0;
                }
                emit RU(m, dm[m].rep);
            }
        }
    }

    function fM(uint256 id) external me(id) {
        require(ms[id] == State.Confirmed && !mr[id].fin, "!");
        mr[id].fin = true;
        ms[id] = State.Finalized;
        emit MFNL(id);
    }

    function cW(uint256 id) external nonReentrant me(id) {
        require(mr[id].fin && !hcw[id][msg.sender], "!");
        uint8 win = mr[id].co;
        uint256 uSh = sh[id][win][msg.sender];
        require(uSh > 0, "!");
        hcw[id][msg.sender] = true;
        sh[id][win][msg.sender] = 0;
        uint256 tp = gTP(id);
        uint256 po = op[id][win];
        require(po > 0, "!");
        uint256 gp = (uSh * tp) / po;
        uint256 sf = (gp * SETTLE) / 10000;
        uint256 np = gp - sf;
        _dS(id, sf);
        (bool s, ) = payable(msg.sender).call{value: np}("");
        require(s, "!");
        emit WC(id, msg.sender, np);
    }

    function _dS(uint256 id, uint256 fee) internal {
        if (mb[id].o == Origin.Community) {
            uint256 ts = (fee * STREAS) / SETTLE;
            uint256 ds = (fee * SDEC) / SETTLE;
            uint256 cs = fee - ts - ds;
            (bool s, ) = treasury.call{value: ts}("");
            require(s, "!");
            drp += ds;
            mf[id].cfe += cs;
        } else {
            uint256 ts = (fee * TSTREAS) / SETTLE;
            uint256 ds = fee - ts;
            (bool s, ) = treasury.call{value: ts}("");
            require(s, "!");
            drp += ds;
        }
    }

    function cCF(uint256 id) external nonReentrant me(id) {
        require(
            mb[id].o == Origin.Community &&
                mb[id].cr == msg.sender &&
                mr[id].fin,
            "!"
        );
        uint256 cl = mf[id].cfe - mf[id].cfc;
        require(cl > 0, "!");
        mf[id].cfc += cl;
        (bool s, ) = payable(msg.sender).call{value: cl}("");
        require(s, "!");
        emit CFC(id, msg.sender, cl);
    }

    function cCS(uint256 id) external nonReentrant me(id) {
        require(mb[id].cr == msg.sender && mr[id].fin && mf[id].csc == 0, "!");
        uint256 tot;
        for (uint256 i; i < csp[id].length; i++) tot += csp[id][i];
        require(tot > 0, "!");
        require(address(this).balance >= gTP(id) + drp, "i");
        mf[id].csc = tot;
        (bool s, ) = payable(msg.sender).call{value: tot}("");
        require(s, "!");
        emit CSC(id, msg.sender, tot);
    }

    function cDR() external nonReentrant {
        require(iad(msg.sender) && dm[msg.sender].rep >= drt, "!");
        uint256 cl = dm[msg.sender].ur;
        require(cl > 0, "!");
        dm[msg.sender].ur = 0;
        dm[msg.sender].trc += cl;
        (bool s, ) = payable(msg.sender).call{value: cl}("");
        require(s, "!");
        emit DRC(msg.sender, cl);
    }

    function aDR(uint256 id) external me(id) {
        require(mr[id].fin, "!");
        uint256 ec;
        address[] memory el = new address[](dml.length);
        for (uint256 i; i < dml.length; i++) {
            address m = dml[i];
            if (iad(m) && dm[m].rep >= drt) {
                el[ec] = m;
                ec++;
            }
        }
        if (ec == 0 || drp == 0) return;
        uint256 rw = drp / ec;
        uint256 td = rw * ec;
        for (uint256 i; i < ec; i++) {
            address m = el[i];
            dm[m].ur += rw;
            dm[m].tre += rw;
        }
        drp -= td;
    }

    function cM(
        uint256 id,
        string calldata reason,
        string calldata
    ) external onlyRole(ADMIN_ROLE) me(id) {
        require(
            ms[id] != State.Finalized &&
                ms[id] != State.Resolved &&
                !mf[id].can,
            "!"
        );
        mf[id].can = true;
        mf[id].cr = reason;
        mf[id].ct = block.timestamp;
        ms[id] = State.Cancelled;
        MV storage v = mv[id];
        if (mb[id].o == Origin.Community && !v.rc && v.ra > 0) {
            v.rc = true;
            (bool s, ) = payable(v.rr).call{value: v.ra}("");
            require(s, "!");
        }
        emit MCAN(id, reason);
    }

    function gL(uint256 id) external view returns (string[] memory) {
        return ol[id];
    }

    function gP(uint256 id) external view returns (uint256[] memory) {
        return op[id];
    }

    function gPr2(uint256 id) external view returns (uint256[] memory) {
        uint256[] memory p = new uint256[](ol[id].length);
        uint256 tp = gTP(id);
        for (uint256 i; i < p.length; i++)
            p[i] = tp > 0 ? (op[id][i] * 1e18) / tp : 0;
        return p;
    }

    function gUS(
        uint256 id,
        uint8 oi,
        address u
    ) external view returns (uint256) {
        return sh[id][oi][u];
    }

    function gDMI(address m) external view returns (DM memory) {
        return dm[m];
    }

    receive() external payable {}
}
