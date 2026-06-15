const App = {
  bets: [],
  parlays: [],
  parlayLegs: [],
  editingParlayId: null,
  expandedLegIndex: null,
  currentMode: 'single',
  schedule: [],
  teamCodes: {},
  sortField: 'matchDate',
  sortDir: 'desc',
  editingId: null,

  async init() {
    try {
      const res = await fetch('data/schedule.json');
      this.schedule = await res.json();
    } catch (e) {
      this.schedule = [];
    }

    try {
      const res = await fetch('data/team_codes.json');
      this.teamCodes = await res.json();
    } catch (e) {
      this.teamCodes = {};
    }

    try {
      const result = await GitHub.pullBets();
      if (result && result.bets) {
        this.bets = result.bets;
        this.parlays = result.parlays || [];
        this.save();
        this.saveParlays();
      } else {
        throw new Error('empty');
      }
    } catch (e) {
      const stored = localStorage.getItem('worldcup_bets');
      const storedParlays = localStorage.getItem('worldcup_parlays');
      if (stored) {
        this.bets = JSON.parse(stored);
        this.parlays = storedParlays ? JSON.parse(storedParlays) : [];
      } else {
        try {
          const res = await fetch('data/bets.json');
          const data = await res.json();
          this.bets = data.bets || [];
          this.parlays = data.parlays || [];
          this.save();
          this.saveParlays();
        } catch (e2) {
          this.bets = [];
          this.parlays = [];
        }
      }
    }

    this.bindEvents();
    this.updateSyncStatus();
    this.render();
  },

  save() {
    localStorage.setItem('worldcup_bets', JSON.stringify(this.bets));
  },

  saveParlays() {
    localStorage.setItem('worldcup_parlays', JSON.stringify(this.parlays));
  },

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
  },

  updateSyncStatus() {
    const syncBtn = document.getElementById('btn-sync');
    const pullBtn = document.getElementById('btn-pull');
    const configured = GitHub.isConfigured();
    syncBtn.disabled = false;
    pullBtn.disabled = false;
    if (!configured) {
      syncBtn.title = 'Save to local file';
      pullBtn.title = 'Pull from GitHub (read-only)';
    } else {
      syncBtn.title = 'Push to GitHub';
      pullBtn.title = 'Pull from GitHub';
    }
  },

  bindEvents() {
    document.getElementById('btn-add-bet').addEventListener('click', () => this.openModal());
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('btn-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });
    document.getElementById('bet-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveBet();
    });
    document.getElementById('btn-delete-bet').addEventListener('click', () => this.deleteBet());

    // Mode tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchMode(tab.dataset.mode));
    });

    // Parlay events (inside unified modal)
    document.getElementById('btn-add-leg').addEventListener('click', () => this.addLeg());
    document.getElementById('parlay-btn-save').addEventListener('click', () => this.saveParlay());
    document.getElementById('parlay-btn-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('btn-delete-parlay').addEventListener('click', () => this.deleteParlay());
    document.getElementById('parlay-amount').addEventListener('input', () => this.updateParlaySummary());
    document.getElementById('parlay-match-picker').addEventListener('change', (e) => this.onParlayMatchPicked(e));

    document.getElementById('btn-sync').addEventListener('click', () => this.syncToGitHub());
    document.getElementById('btn-pull').addEventListener('click', () => this.pullFromGitHub());
    document.getElementById('btn-settings').addEventListener('click', () => this.openSettings());
    document.getElementById('settings-close').addEventListener('click', () => this.closeSettings());
    document.getElementById('settings-cancel').addEventListener('click', () => this.closeSettings());
    document.getElementById('settings-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeSettings();
    });
    document.getElementById('settings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    document.getElementById('filter-stage').addEventListener('change', () => this.render());
    document.getElementById('filter-team').addEventListener('change', () => this.render());
    document.getElementById('filter-status').addEventListener('change', () => this.render());
    document.getElementById('filter-result').addEventListener('change', () => this.render());

    document.querySelectorAll('.bet-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (this.sortField === field) {
          this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortField = field;
          this.sortDir = 'desc';
        }
        this.render();
      });
    });

    const oddsInput = document.getElementById('form-odds');
    const amountInput = document.getElementById('form-amount');
    const actualHome = document.getElementById('form-actual-home');
    const actualAway = document.getElementById('form-actual-away');
    const predHome = document.getElementById('form-pred-home');
    const predAway = document.getElementById('form-pred-away');

    [oddsInput, amountInput, actualHome, actualAway, predHome, predAway].forEach(el => {
      el.addEventListener('input', () => this.updateFormSummary());
    });

    document.getElementById('form-match-picker').addEventListener('change', (e) => this.onMatchPicked(e));
    document.getElementById('form-bet-type').addEventListener('change', () => this.togglePredInput('form'));
    document.getElementById('parlay-leg-bet-type').addEventListener('change', () => this.togglePredInput('parlay'));
  },

  togglePredInput(prefix) {
    const betType = document.getElementById(prefix === 'form' ? 'form-bet-type' : 'parlay-leg-bet-type').value;
    const isWDL = betType === 'result';
    const isHalfFull = betType === 'half_full';
    const isGoals = betType === 'total_goals';
    const isScore = betType === 'score';

    const scoreId = prefix === 'form' ? 'form-pred-score-group' : 'parlay-pred-score-group';
    const wdlId = prefix === 'form' ? 'form-pred-wdl-group' : 'parlay-pred-wdl-group';
    const halfFullId = prefix === 'form' ? 'form-pred-halffull-group' : 'parlay-pred-halffull-group';
    const goalsId = prefix === 'form' ? 'form-pred-goals-group' : 'parlay-pred-goals-group';

    document.getElementById(scoreId).style.display = isScore ? '' : 'none';
    document.getElementById(wdlId).style.display = isWDL ? '' : 'none';
    document.getElementById(halfFullId).style.display = isHalfFull ? '' : 'none';
    document.getElementById(goalsId).style.display = isGoals ? '' : 'none';

    const actualHFId = prefix === 'form' ? 'form-actual-halffull-group' : 'parlay-actual-halffull-group';
    const actualScoreId = prefix === 'form' ? 'form-actual-score-group' : 'parlay-actual-score-group';
    document.getElementById(actualHFId).style.display = isHalfFull ? '' : 'none';
    document.getElementById(actualScoreId).style.display = isHalfFull ? 'none' : '';
  },

  switchMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    document.querySelector('[data-mode-section="single"]').style.display = mode === 'single' ? '' : 'none';
    document.querySelector('[data-mode-section="parlay"]').style.display = mode === 'parlay' ? '' : 'none';
    const title = document.getElementById('modal-title');
    if (!this.editingId && !this.editingParlayId) {
      title.textContent = mode === 'single' ? 'Add Bet' : 'Add Parlay';
    }
    if (mode === 'parlay') {
      this.renderParlayLegs();
      this.updateParlaySummary();
    }
  },

  onMatchPicked(e) {
    const idx = parseInt(e.target.value);
    if (isNaN(idx)) return;
    const match = this.schedule[idx];
    if (!match) return;

    document.getElementById('form-date').value = match.date;
    document.getElementById('form-stage').value = match.stage;
    document.getElementById('form-home-team').value = match.homeTeam;
    document.getElementById('form-away-team').value = match.awayTeam;

    if (match.odds && match.odds.home_win) {
      document.getElementById('form-odds').value = match.odds.home_win;
    }

    this.updateFormSummary();
  },

  teamFlag(name) {
    const codeMap = {
      MEX:'🇲🇽',RSA:'🇿🇦',KOR:'🇰🇷',CZE:'🇨🇿',CAN:'🇨🇦',BIH:'🇧🇦',QAT:'🇶🇦',SUI:'🇨🇭',
      BRA:'🇧🇷',MAR:'🇲🇦',HAI:'🇭🇹',SCO:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',USA:'🇺🇸',PAR:'🇵🇾',AUS:'🇦🇺',TUR:'🇹🇷',
      GER:'🇩🇪',CUW:'🇨🇼',CIV:'🇨🇮',ECU:'🇪🇨',NED:'🇳🇱',JPN:'🇯🇵',SWE:'🇸🇪',TUN:'🇹🇳',
      BEL:'🇧🇪',EGY:'🇪🇬',IRN:'🇮🇷',NZL:'🇳🇿',ESP:'🇪🇸',CPV:'🇨🇻',KSA:'🇸🇦',URU:'🇺🇾',
      FRA:'🇫🇷',SEN:'🇸🇳',IRQ:'🇮🇶',NOR:'🇳🇴',ARG:'🇦🇷',ALG:'🇩🇿',AUT:'🇦🇹',JOR:'🇯🇴',
      POR:'🇵🇹',COD:'🇨🇩',UZB:'🇺🇿',COL:'🇨🇴',ENG:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',CRO:'🇭🇷',GHA:'🇬🇭',PAN:'🇵🇦'
    };
    const code = this.teamCodes[name];
    return code && codeMap[code] ? codeMap[code] : '';
  },

  populateMatchPicker() {
    const picker = document.getElementById('form-match-picker');
    picker.innerHTML = '<option value="">-- Select a match --</option>' +
      this.schedule.map((m, i) => {
        const label = `${m.date} | ${m.stage} | ${this.teamFlag(m.homeTeam)} ${m.homeTeam} vs ${this.teamFlag(m.awayTeam)} ${m.awayTeam}`;
        return `<option value="${i}">${label}</option>`;
      }).join('');
  },

  getFilteredBets() {
    const parlayRows = this.parlays.map(p => ({
      _parlay: true,
      _parlayId: p.id,
      _matchCount: p.matchCount || this.countMatches(p.legs),
      matchDate: p.legs[0] ? p.legs[0].matchDate : '',
      stage: p.legs.length + '串1',
      homeTeam: p.legs.map(l => l.homeTeam).join(', '),
      awayTeam: p.legs.map(l => l.awayTeam).join(', '),
      betType: 'parlay',
      prediction: null,
      actualScore: null,
      odds: p.combinedOdds,
      amount: p.amount,
      profit: p.profit,
      status: p.status,
      confidence: p.confidence,
      legs: p.legs
    }));

    let filtered = [...this.bets, ...parlayRows];
    const stage = document.getElementById('filter-stage').value;
    const team = document.getElementById('filter-team').value;
    const status = document.getElementById('filter-status').value;
    const result = document.getElementById('filter-result').value;

    if (stage) filtered = filtered.filter(b => {
      if (b._parlay) return b.legs.some(l => l.stage === stage);
      return b.stage === stage;
    });
    if (team) filtered = filtered.filter(b => {
      if (b._parlay) return b.legs.some(l => l.homeTeam === team || l.awayTeam === team);
      return b.homeTeam === team || b.awayTeam === team;
    });
    if (status) filtered = filtered.filter(b => b.status === status);
    if (result === 'win') filtered = filtered.filter(b => b.status === 'settled' && b.profit > 0);
    if (result === 'lose') filtered = filtered.filter(b => b.status === 'settled' && b.profit <= 0);

    filtered.sort((a, b) => {
      let va = a[this.sortField];
      let vb = b[this.sortField];
      if (typeof va === 'string') {
        return this.sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return this.sortDir === 'asc' ? va - vb : vb - va;
    });

    return filtered;
  },

  populateFilters() {
    const allTeams = [
      ...this.bets.flatMap(b => [b.homeTeam, b.awayTeam]),
      ...this.parlays.flatMap(p => p.legs.flatMap(l => [l.homeTeam, l.awayTeam]))
    ];
    const allStages = [
      ...this.bets.map(b => b.stage),
      ...this.parlays.flatMap(p => p.legs.map(l => l.stage))
    ];
    const stages = [...new Set(allStages)].sort();
    const teams = [...new Set(allTeams)].sort();

    const stageSelect = document.getElementById('filter-stage');
    const currentStage = stageSelect.value;
    stageSelect.innerHTML = '<option value="">All Stages</option>' +
      stages.map(s => `<option value="${s}" ${s === currentStage ? 'selected' : ''}>${s}</option>`).join('');

    const teamSelect = document.getElementById('filter-team');
    const currentTeam = teamSelect.value;
    teamSelect.innerHTML = '<option value="">All Teams</option>' +
      teams.map(t => `<option value="${t}" ${t === currentTeam ? 'selected' : ''}>${t}</option>`).join('');
  },

  render() {
    this.populateFilters();
    const filtered = this.getFilteredBets();
    const tbody = document.getElementById('bet-table-body');
    const emptyState = document.getElementById('empty-state');

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      tbody.innerHTML = filtered.map(b => this.renderRow(b)).join('');
    }

    Stats.renderAll(this.bets, this.parlays);
  },

  renderRow(b) {
    const rowClass = b.status === 'pending' ? 'row-pending' :
                     b.profit > 0 ? 'row-win' : 'row-lose';

    const profitClass = b.profit > 0 ? 'profit-positive' : b.profit < 0 ? 'profit-negative' : 'profit-zero';
    const profitStr = b.status === 'pending' ? '-' : `${b.profit >= 0 ? '+' : ''}¥${b.profit}`;

    const statusBadge = b.status === 'pending' ? '<span class="badge badge-pending">Pending</span>' :
                        b.profit > 0 ? '<span class="badge badge-win">Won</span>' :
                        '<span class="badge badge-lose">Lost</span>';

    const betTypeLabels = { result: '胜平负', score: '比分', total_goals: '总进球', half_full: '半全场', parlay: 'Parlay' };

    if (b._parlay) {
      const wdlLabels = { win: '胜', draw: '平', lose: '负' };
      const matchMap = {};
      for (const l of b.legs) {
        const key = `${l.matchDate}_${l.homeTeam}_${l.awayTeam}`;
        if (!matchMap[key]) matchMap[key] = { match: l, preds: [], actuals: [] };
        let pred;
        const h = l.prediction.handicap || 0;
        if (l.prediction.wdl) {
          pred = wdlLabels[l.prediction.wdl];
          if (h !== 0) pred += `(${h > 0 ? '+' : ''}${h})`;
        } else if (l.prediction.halffull) {
          pred = l.prediction.halffull;
        } else if (l.prediction.goals !== undefined) {
          pred = l.prediction.goals + ' goals';
        } else {
          pred = `${l.prediction.home}:${l.prediction.away}`;
        }
        matchMap[key].preds.push(`<span class="badge badge-pred">${pred}</span>`);
        if (!matchMap[key].actualSet) {
          let actual = null;
          if (l.actualHalffull) actual = l.actualHalffull;
          else if (l.actualScore) actual = `${l.actualScore.home}:${l.actualScore.away}`;
          if (actual) {
            matchMap[key].actual = `<span class="badge badge-actual">${actual}</span>`;
            matchMap[key].actualSet = true;
          }
        }
      }
      const matches = Object.values(matchMap);
      const legsStr = matches.map(m => `${this.teamWithFlag(m.match.homeTeam)} vs ${this.teamWithFlag(m.match.awayTeam)}`).join('<br>');
      const predStr = matches.map(m => m.preds.join(' ')).join('<br>');
      const actualStr = matches.map(m => m.actual || '-').join('<br>');
      const stageStr = matches.map(m => this.displayStage(m.match.stage)).join('<br>');
      const betTypes = [...new Set(b.legs.map(l => betTypeLabels[l.betType] || l.betType))];
      const betTypesStr = betTypes.join('/');
      return `
        <tr class="${rowClass}">
          <td>${b.matchDate}</td>
          <td>${stageStr}</td>
          <td>${legsStr}</td>
          <td><span class="badge badge-bettype">${betTypesStr}</span> <span class="parlay-type-badge">${b._matchCount}串1</span></td>
          <td>${predStr}</td>
          <td>${actualStr}</td>
          <td>${b.odds.toFixed(2)}</td>
          <td>¥${b.amount}</td>
          <td class="${profitClass}">${profitStr}</td>
          <td><span class="confidence-dot confidence-${b.confidence}"></span>${b.confidence}</td>
          <td>${statusBadge}</td>
          <td><button class="btn btn-sm btn-secondary" onclick="App.openModal(${b._parlayId}, 'parlay')">Edit</button></td>
        </tr>
      `;
    }

    const wdlLabels = { win: '胜', draw: '平', lose: '负' };
    let predStr = '-';
    if (b.prediction) {
      if (b.prediction.wdl) {
        const h = b.prediction.handicap || 0;
        predStr = wdlLabels[b.prediction.wdl];
        if (h !== 0) predStr += ` (${h > 0 ? '+' : ''}${h})`;
      }
      else if (b.prediction.halffull) predStr = b.prediction.halffull;
      else if (b.prediction.goals !== undefined) predStr = b.prediction.goals + ' goals';
      else predStr = `${b.prediction.home} : ${b.prediction.away}`;
    }
    let actualStr = '-';
    if (b.actualHalffull) actualStr = `<span class="badge badge-actual">${b.actualHalffull}</span>`;
    else if (b.actualScore) actualStr = `<span class="badge badge-actual">${b.actualScore.home} : ${b.actualScore.away}</span>`;

    return `
      <tr class="${rowClass}">
        <td>${b.matchDate}</td>
        <td>${this.displayStage(b.stage)}</td>
        <td>${this.teamWithFlag(b.homeTeam)} vs ${this.teamWithFlag(b.awayTeam)}</td>
        <td><span class="badge badge-bettype">${betTypeLabels[b.betType] || b.betType}</span> <span class="badge badge-single">Single</span></td>
        <td><span class="badge badge-pred">${predStr}</span></td>
        <td>${actualStr}</td>
        <td>${b.odds.toFixed(2)}</td>
        <td>¥${b.amount}</td>
        <td class="${profitClass}">${profitStr}</td>
        <td>
          <span class="confidence-dot confidence-${b.confidence}"></span>${b.confidence}
        </td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="App.openModal(${b.id})">Edit</button>
        </td>
      </tr>
    `;
  },

  openModal(id = null, mode = 'single') {
    this.editingId = null;
    this.editingParlayId = null;
    this.parlayLegs = [];
    this.expandedLegIndex = null;
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('btn-delete-bet');
    const form = document.getElementById('bet-form');
    const tabs = document.getElementById('mode-tabs');

    form.reset();
    document.getElementById('form-summary').style.display = 'none';
    this.populateMatchPicker();
    this.populateParlayMatchPicker();

    if (mode === 'parlay' || (typeof id === 'number' && this.parlays.find(p => p.id === id))) {
      // Parlay mode
      if (typeof id === 'number') {
        this.editingParlayId = id;
        mode = 'parlay';
      }
      this.switchMode('parlay');
      deleteBtn.style.display = 'none';
      this.clearParlayLegForm();
      document.getElementById('parlay-amount').value = '';
      document.getElementById('parlay-confidence').value = 'medium';
      document.getElementById('parlay-notes').value = '';
      this.parlayLegs = [];
      this.expandedLegIndex = null;
      document.getElementById('parlay-summary').style.display = 'none';

      if (this.editingParlayId) {
        title.textContent = 'Edit Parlay';
        tabs.style.display = 'none';
        document.getElementById('btn-delete-parlay').style.display = 'block';
        const parlay = this.parlays.find(p => p.id === this.editingParlayId);
        if (parlay) {
          this.parlayLegs = JSON.parse(JSON.stringify(parlay.legs));
          document.getElementById('parlay-amount').value = parlay.amount;
          document.getElementById('parlay-confidence').value = parlay.confidence;
          document.getElementById('parlay-notes').value = parlay.notes || '';
        }
      } else {
        title.textContent = 'Add Bet';
        tabs.style.display = '';
        document.getElementById('btn-delete-parlay').style.display = 'none';
      }
      this.renderParlayLegs();
      this.updateParlaySummary();
    } else {
      // Single mode
      this.switchMode('single');
      if (id) {
        this.editingId = id;
        title.textContent = 'Edit Bet';
        tabs.style.display = 'none';
        deleteBtn.style.display = 'block';
        const bet = this.bets.find(b => b.id === id);
        if (bet) {
          document.getElementById('form-id').value = bet.id;
          document.getElementById('form-date').value = bet.matchDate;
          document.getElementById('form-stage').value = bet.stage;
          document.getElementById('form-home-team').value = bet.homeTeam;
          document.getElementById('form-away-team').value = bet.awayTeam;
          document.getElementById('form-bet-type').value = bet.betType;
          document.getElementById('form-confidence').value = bet.confidence;
          this.togglePredInput('form');
          if (bet.prediction?.wdl) {
            document.getElementById('form-pred-wdl').value = bet.prediction.wdl;
            document.getElementById('form-handicap').value = bet.prediction.handicap || 0;
          } else if (bet.prediction?.halffull) {
            document.getElementById('form-pred-halffull').value = bet.prediction.halffull;
          } else if (bet.prediction?.goals !== undefined) {
            document.getElementById('form-pred-goals').value = bet.prediction.goals;
          } else {
            document.getElementById('form-pred-home').value = bet.prediction?.home ?? '';
            document.getElementById('form-pred-away').value = bet.prediction?.away ?? '';
          }
          document.getElementById('form-actual-home').value = bet.actualScore?.home ?? '';
          document.getElementById('form-actual-away').value = bet.actualScore?.away ?? '';
          document.getElementById('form-actual-halffull').value = bet.actualHalffull || '';
          document.getElementById('form-odds').value = bet.odds;
          document.getElementById('form-amount').value = bet.amount;
          document.getElementById('form-notes').value = bet.notes || '';
          this.updateFormSummary();
        }
      } else {
        title.textContent = 'Add Bet';
        tabs.style.display = '';
        deleteBtn.style.display = 'none';
        this.togglePredInput('form');
      }
    }

    modal.classList.add('active');
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    this.editingId = null;
    this.editingParlayId = null;
    this.parlayLegs = [];
    this.expandedLegIndex = null;
  },

  updateFormSummary() {
    const odds = parseFloat(document.getElementById('form-odds').value) || 0;
    const amount = parseFloat(document.getElementById('form-amount').value) || 0;
    const actualHome = document.getElementById('form-actual-home').value;
    const actualAway = document.getElementById('form-actual-away').value;
    const predHome = document.getElementById('form-pred-home').value;
    const predAway = document.getElementById('form-pred-away').value;

    const summary = document.getElementById('form-summary');
    if (odds > 0 && amount > 0) {
      summary.style.display = 'block';
      const payout = (odds * amount).toFixed(0);
      document.getElementById('form-payout').textContent = `¥${payout}`;

      if (actualHome !== '' && actualAway !== '' && predHome !== '' && predAway !== '') {
        const betType = document.getElementById('form-bet-type').value;
        const predResult = this.getResult(parseInt(predHome), parseInt(predAway));
        const actualResult = this.getResult(parseInt(actualHome), parseInt(actualAway));
        let won = false;
        if (betType === 'score') {
          won = parseInt(predHome) === parseInt(actualHome) && parseInt(predAway) === parseInt(actualAway);
        } else {
          won = predResult === actualResult;
        }
        const profit = won ? Math.round(odds * amount - amount) : -amount;
        const profitEl = document.getElementById('form-profit');
        profitEl.textContent = `${profit >= 0 ? '+' : ''}¥${profit}`;
        profitEl.style.color = profit >= 0 ? 'var(--color-win)' : 'var(--color-lose)';
      } else {
        document.getElementById('form-profit').textContent = 'Pending';
        document.getElementById('form-profit').style.color = 'var(--text-muted)';
      }
    } else {
      summary.style.display = 'none';
    }
  },

  displayStage(stage) {
    return stage;
  },

  teamWithFlag(name) {
    const code = this.teamCodes[name];
    if (code) return `<img class="team-flag" src="data/flags/${code}.png" alt="${name}"> ${name}`;
    return name;
  },

  getResult(home, away) {
    if (home > away) return 'home_win';
    if (home < away) return 'away_win';
    return 'draw';
  },

  saveBet() {
    const id = this.editingId || (this.bets.length > 0 ? Math.max(...this.bets.map(b => b.id)) + 1 : 1);
    const odds = parseFloat(document.getElementById('form-odds').value);
    const amount = parseFloat(document.getElementById('form-amount').value);
    const betType = document.getElementById('form-bet-type').value;
    const actualHomeVal = document.getElementById('form-actual-home').value;
    const actualAwayVal = document.getElementById('form-actual-away').value;

    const isWDL = betType === 'result';
    const isHalfFull = betType === 'half_full';
    const isGoals = betType === 'total_goals';

    let prediction, predictionResult;
    if (isWDL) {
      const wdl = document.getElementById('form-pred-wdl').value;
      const handicap = parseFloat(document.getElementById('form-handicap').value) || 0;
      prediction = { wdl, handicap };
      predictionResult = wdl;
    } else if (isHalfFull) {
      const hf = document.getElementById('form-pred-halffull').value;
      prediction = { halffull: hf };
      predictionResult = hf;
    } else if (isGoals) {
      const goals = parseInt(document.getElementById('form-pred-goals').value);
      prediction = { goals };
      predictionResult = null;
    } else {
      const predHome = parseInt(document.getElementById('form-pred-home').value);
      const predAway = parseInt(document.getElementById('form-pred-away').value);
      prediction = { home: predHome, away: predAway };
      predictionResult = this.getResult(predHome, predAway);
    }

    const hasActual = actualHomeVal !== '' && actualAwayVal !== '';
    const actualScore = hasActual ? { home: parseInt(actualHomeVal), away: parseInt(actualAwayVal) } : null;
    const actualResult = hasActual ? this.getResult(actualScore.home, actualScore.away) : null;
    const actualHF = isHalfFull ? document.getElementById('form-actual-halffull').value : '';
    const hasHFActual = isHalfFull && actualHF !== '';
    const isSettled = isHalfFull ? hasHFActual : hasActual;

    let payout = 0;
    let profit = 0;
    let status = 'pending';

    if (isSettled) {
      status = 'settled';
      let won = false;
      if (betType === 'score') {
        won = prediction.home === actualScore.home && prediction.away === actualScore.away;
      } else if (isWDL) {
        const h = prediction.handicap || 0;
        const adjHome = actualScore.home + h;
        const adjResult = adjHome > actualScore.away ? 'win' : adjHome < actualScore.away ? 'lose' : 'draw';
        won = prediction.wdl === adjResult;
      } else if (isHalfFull) {
        won = prediction.halffull === actualHF;
      } else if (isGoals) {
        won = prediction.goals === (actualScore.home + actualScore.away);
      }
      payout = won ? Math.round(odds * amount) : 0;
      profit = won ? Math.round(odds * amount - amount) : -amount;
    }

    const bet = {
      id,
      matchDate: document.getElementById('form-date').value,
      stage: document.getElementById('form-stage').value,
      homeTeam: document.getElementById('form-home-team').value,
      awayTeam: document.getElementById('form-away-team').value,
      betType,
      prediction,
      predictionResult,
      odds,
      amount,
      actualScore,
      actualResult,
      actualHalffull: actualHF || null,
      payout,
      profit,
      status,
      confidence: document.getElementById('form-confidence').value,
      notes: document.getElementById('form-notes').value,
    };

    if (this.editingId) {
      const idx = this.bets.findIndex(b => b.id === this.editingId);
      if (idx !== -1) this.bets[idx] = bet;
    } else {
      this.bets.push(bet);
    }

    this.save();
    this.closeModal();
    this.render();
  },

  deleteBet() {
    if (this.editingId && confirm('Are you sure you want to delete this bet?')) {
      this.bets = this.bets.filter(b => b.id !== this.editingId);
      this.save();
      this.closeModal();
      this.render();
    }
  },

  async syncToGitHub() {
    const btn = document.getElementById('btn-sync');
    btn.classList.add('syncing');
    btn.disabled = true;
    try {
      if (GitHub.isConfigured()) {
        await GitHub.commitBets(this.bets, this.parlays);
        this.showToast('Synced to GitHub!', 'success');
      } else {
        await this.syncToLocal();
        this.showToast('Saved to local file!', 'success');
      }
    } catch (err) {
      this.showToast('Sync failed: ' + err.message, 'error');
    } finally {
      btn.classList.remove('syncing');
      btn.disabled = false;
    }
  },

  async syncToLocal() {
    const content = JSON.stringify({
      meta: {
        tournament: '2026 FIFA World Cup',
        currency: 'CNY',
        startDate: '2026-06-11',
        location: 'USA / Canada / Mexico'
      },
      bets: this.bets,
      parlays: this.parlays
    }, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bets.json';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  async pullFromGitHub() {
    const btn = document.getElementById('btn-pull');
    btn.classList.add('syncing');
    btn.disabled = true;
    try {
      const result = await GitHub.pullBets();
      if (result === null) {
        this.showToast('No data file found on GitHub', 'info');
      } else {
        this.bets = result.bets;
        this.parlays = result.parlays || [];
        this.save();
        this.saveParlays();
        this.render();
        this.showToast(`Pulled ${result.bets.length} bets, ${this.parlays.length} parlays from GitHub`, 'success');
      }
    } catch (err) {
      this.showToast('Pull failed: ' + err.message, 'error');
    } finally {
      btn.classList.remove('syncing');
      btn.disabled = false;
    }
  },

  openSettings() {
    document.getElementById('gh-token').value = GitHub.getToken();
    document.getElementById('gh-status').textContent = '';
    document.getElementById('settings-overlay').classList.add('active');
  },

  closeSettings() {
    document.getElementById('settings-overlay').classList.remove('active');
  },

  saveSettings() {
    const token = document.getElementById('gh-token').value.trim();
    GitHub.saveToken(token);
    this.updateSyncStatus();
    this.closeSettings();
    this.showToast('Token saved', 'success');
  },

  // === Parlay Methods ===

  onParlayMatchPicked(e) {
    const idx = parseInt(e.target.value);
    if (isNaN(idx)) return;
    const match = this.schedule[idx];
    if (!match) return;
    document.getElementById('parlay-leg-date').value = match.date;
    document.getElementById('parlay-leg-stage').value = match.stage;
    document.getElementById('parlay-leg-home').value = match.homeTeam;
    document.getElementById('parlay-leg-away').value = match.awayTeam;
    if (match.odds && match.odds.home_win) {
      document.getElementById('parlay-leg-odds').value = match.odds.home_win;
    }
  },

  populateParlayMatchPicker() {
    const picker = document.getElementById('parlay-match-picker');
    picker.innerHTML = '<option value="">-- Select a match --</option>' +
      this.schedule.map((m, i) => {
        const label = `${m.date} | ${m.stage} | ${this.teamFlag(m.homeTeam)} ${m.homeTeam} vs ${this.teamFlag(m.awayTeam)} ${m.awayTeam}`;
        return `<option value="${i}">${label}</option>`;
      }).join('');
  },

  clearParlayLegForm() {
    document.getElementById('parlay-match-picker').value = '';
    document.getElementById('parlay-leg-date').value = '';
    document.getElementById('parlay-leg-stage').value = '';
    document.getElementById('parlay-leg-home').value = '';
    document.getElementById('parlay-leg-away').value = '';
    document.getElementById('parlay-leg-bet-type').value = 'result';
    document.getElementById('parlay-leg-pred-home').value = '';
    document.getElementById('parlay-leg-pred-away').value = '';
    document.getElementById('parlay-leg-pred-wdl').value = 'win';
    document.getElementById('parlay-leg-handicap').value = '0';
    document.getElementById('parlay-leg-pred-halffull').value = '胜-胜';
    document.getElementById('parlay-leg-pred-goals').value = '';
    document.getElementById('parlay-leg-actual-halffull').value = '';
    document.getElementById('parlay-leg-odds').value = '';
    document.getElementById('parlay-leg-actual-home').value = '';
    document.getElementById('parlay-leg-actual-away').value = '';
    this.togglePredInput('parlay');
  },

  addLeg() {
    const home = document.getElementById('parlay-leg-home').value.trim();
    const away = document.getElementById('parlay-leg-away').value.trim();
    const odds = document.getElementById('parlay-leg-odds').value;
    const betType = document.getElementById('parlay-leg-bet-type').value;
    const isWDL = betType === 'result';
    const isHalfFull = betType === 'half_full';
    const isGoals = betType === 'total_goals';

    if (!home || !away || !odds) {
      this.showToast('Please fill in team names and odds', 'error');
      return;
    }

    let prediction, predictionResult;
    if (isWDL) {
      const wdl = document.getElementById('parlay-leg-pred-wdl').value;
      const handicap = parseFloat(document.getElementById('parlay-leg-handicap').value) || 0;
      prediction = { wdl, handicap };
      predictionResult = wdl;
    } else if (isHalfFull) {
      const hf = document.getElementById('parlay-leg-pred-halffull').value;
      prediction = { halffull: hf };
      predictionResult = hf;
    } else if (isGoals) {
      const goals = document.getElementById('parlay-leg-pred-goals').value;
      if (goals === '') { this.showToast('Please enter predicted goals', 'error'); return; }
      prediction = { goals: parseInt(goals) };
      predictionResult = null;
    } else {
      const predHome = document.getElementById('parlay-leg-pred-home').value;
      const predAway = document.getElementById('parlay-leg-pred-away').value;
      if (predHome === '' || predAway === '') { this.showToast('Please enter predicted score', 'error'); return; }
      prediction = { home: parseInt(predHome), away: parseInt(predAway) };
      predictionResult = this.getResult(parseInt(predHome), parseInt(predAway));
    }

    const actualHomeVal = document.getElementById('parlay-leg-actual-home').value;
    const actualAwayVal = document.getElementById('parlay-leg-actual-away').value;
    const actualHF = isHalfFull ? document.getElementById('parlay-leg-actual-halffull').value : '';
    const hasHFActual = isHalfFull && actualHF !== '';
    const hasActual = actualHomeVal !== '' && actualAwayVal !== '';
    const legSettled = isHalfFull ? hasHFActual : hasActual;

    const leg = {
      matchDate: document.getElementById('parlay-leg-date').value,
      stage: document.getElementById('parlay-leg-stage').value,
      homeTeam: home,
      awayTeam: away,
      betType,
      prediction,
      predictionResult,
      odds: parseFloat(odds),
      actualScore: hasActual ? { home: parseInt(actualHomeVal), away: parseInt(actualAwayVal) } : null,
      actualResult: hasActual ? this.getResult(parseInt(actualHomeVal), parseInt(actualAwayVal)) : null,
      actualHalffull: actualHF || null,
      won: null
    };

    if (legSettled) {
      if (betType === 'score') {
        leg.won = prediction.home === leg.actualScore.home && prediction.away === leg.actualScore.away;
      } else if (isWDL) {
        const h = prediction.handicap || 0;
        const adjHome = leg.actualScore.home + h;
        const adjResult = adjHome > leg.actualScore.away ? 'win' : adjHome < leg.actualScore.away ? 'lose' : 'draw';
        leg.won = prediction.wdl === adjResult;
      } else if (isHalfFull) {
        leg.won = prediction.halffull === actualHF;
      } else if (isGoals) {
        leg.won = prediction.goals === (leg.actualScore.home + leg.actualScore.away);
      }
    }

    this.parlayLegs.push(leg);
    this.clearParlayLegForm();
    this.renderParlayLegs();
    this.updateParlaySummary();
  },

  removeLeg(index) {
    this.parlayLegs.splice(index, 1);
    this.renderParlayLegs();
    this.updateParlaySummary();
  },

  updateLegActual(index, el, field) {
    const leg = this.parlayLegs[index];
    if (!leg) return;

    if (leg.betType === 'half_full') {
      leg.actualHalffull = el.value || null;
      if (el.value && leg.prediction.halffull) {
        leg.won = leg.prediction.halffull === el.value;
      } else {
        leg.won = null;
      }
    } else if (field === 'handicap') {
      leg.prediction.handicap = parseInt(el.value) || 0;
      this.recalcLegWon(leg);
    } else {
      if (!leg.actualScore) leg.actualScore = { home: null, away: null };
      leg.actualScore[field] = el.value !== '' ? parseInt(el.value) : null;
      this.recalcLegWon(leg);
    }
    this.renderParlayLegs();
  },

  recalcLegWon(leg) {
    if (!leg.actualScore || leg.actualScore.home === null || leg.actualScore.away === null) {
      leg.won = null;
      leg.actualResult = null;
      return;
    }
    leg.actualResult = this.getResult(leg.actualScore.home, leg.actualScore.away);
    if (leg.betType === 'score') {
      leg.won = leg.prediction.home === leg.actualScore.home && leg.prediction.away === leg.actualScore.away;
    } else if (leg.betType === 'result') {
      const h = leg.prediction.handicap || 0;
      const adjHome = leg.actualScore.home + h;
      const adjResult = adjHome > leg.actualScore.away ? 'win' : adjHome < leg.actualScore.away ? 'lose' : 'draw';
      leg.won = leg.prediction.wdl === adjResult;
    } else if (leg.betType === 'total_goals') {
      leg.won = leg.prediction.goals === (leg.actualScore.home + leg.actualScore.away);
    }
  },

  renderParlayLegs() {
    const container = document.getElementById('parlay-legs-list');
    const empty = document.getElementById('parlay-legs-empty');
    const betTypeLabels = { result: '胜平负', score: '比分', total_goals: '总进球', half_full: '半全场', handicap: '让球' };

    if (this.parlayLegs.length === 0) {
      empty.style.display = 'block';
      container.querySelectorAll('.leg-item, .leg-expand').forEach(el => el.remove());
      return;
    }

    empty.style.display = 'none';
    const wdlLabels = { win: '胜', draw: '平', lose: '负' };
    const hfOptions = ['胜-胜','胜-平','胜-负','平-胜','平-平','平-负','负-胜','负-平','负-负'];
    const html = this.parlayLegs.map((leg, i) => {
      let predStr;
      if (leg.prediction.wdl) {
        const h = leg.prediction.handicap || 0;
        predStr = wdlLabels[leg.prediction.wdl];
        if (h !== 0) predStr += ` (${h > 0 ? '+' : ''}${h})`;
      }
      else if (leg.prediction.halffull) predStr = leg.prediction.halffull;
      else if (leg.prediction.goals !== undefined) predStr = leg.prediction.goals + ' goals';
      else predStr = `${leg.prediction.home}:${leg.prediction.away}`;

      const statusIcon = leg.won === true ? '<span class="badge badge-win">W</span>' :
                          leg.won === false ? '<span class="badge badge-lose">L</span>' :
                          '<span class="badge badge-pending">?</span>';

      const isExpanded = this.expandedLegIndex === i;
      const isHF = leg.betType === 'half_full';
      const actualHome = leg.actualScore ? leg.actualScore.home : '';
      const actualAway = leg.actualScore ? leg.actualScore.away : '';
      const actualHF = leg.actualHalffull || '';
      const handicap = leg.prediction.handicap || 0;

      let expandedHtml = '';
      if (isExpanded) {
        expandedHtml = `<div class="leg-expand">
          <div class="form-row" style="margin-bottom:0;">
            <div class="form-group">
              <label>Actual Score + 让球</label>
              <div class="score-handicap-row">
                <div class="score-input">
                  <input type="number" min="0" placeholder="H" value="${actualHome}" data-leg="${i}" data-field="home" onchange="App.onLegActualChange(this)">
                  <span class="score-sep">:</span>
                  <input type="number" min="0" placeholder="A" value="${actualAway}" data-leg="${i}" data-field="away" onchange="App.onLegActualChange(this)">
                </div>
                <span class="score-sep">让</span>
                <input type="number" step="1" value="${handicap}" placeholder="0" class="handicap-field" data-leg="${i}" data-field="handicap" onchange="App.onLegActualChange(this)">
              </div>
            </div>
            ${isHF ? `<div class="form-group">
              <label>Actual Result (半场-全场)</label>
              <select data-leg="${i}" data-field="halffull" onchange="App.onLegActualChange(this)">
                <option value="">-- pending --</option>
                ${hfOptions.map(o => `<option value="${o}" ${actualHF === o ? 'selected' : ''}>${o}</option>`).join('')}
              </select>
            </div>` : ''}
          </div>
        </div>`;
      }

      return `
        <div class="leg-item ${isExpanded ? 'leg-item-expanded' : ''}" onclick="App.toggleLegExpand(${i}, event)">
          <div class="leg-item-info">
            <div class="leg-item-match">${leg.homeTeam} vs ${leg.awayTeam} ${statusIcon}</div>
            <div class="leg-item-detail">${leg.matchDate} &middot; ${leg.stage} &middot; ${betTypeLabels[leg.betType] || leg.betType} &middot; Pred: ${predStr} &middot; Odds: ${leg.odds.toFixed(2)}</div>
          </div>
          <span class="leg-item-odds">&times;${leg.odds.toFixed(2)}</span>
          <button class="leg-item-remove" onclick="event.stopPropagation();App.removeLeg(${i})">&times;</button>
        </div>
        ${expandedHtml}
      `;
    }).join('');

    const existingItems = container.querySelectorAll('.leg-item, .leg-expand');
    existingItems.forEach(el => el.remove());
    container.insertAdjacentHTML('beforeend', html);
  },

  toggleLegExpand(index, event) {
    if (event.target.closest('button') || event.target.closest('input') || event.target.closest('select')) return;
    this.expandedLegIndex = this.expandedLegIndex === index ? null : index;
    this.renderParlayLegs();
  },

  onLegActualChange(el) {
    const i = parseInt(el.dataset.leg);
    const field = el.dataset.field;
    const leg = this.parlayLegs[i];
    if (!leg) return;

    const matchKey = `${leg.matchDate}_${leg.homeTeam}_${leg.awayTeam}`;

    for (const l of this.parlayLegs) {
      const key = `${l.matchDate}_${l.homeTeam}_${l.awayTeam}`;
      if (key !== matchKey) continue;

      if (field === 'home' || field === 'away') {
        if (!l.actualScore) l.actualScore = { home: null, away: null };
        l.actualScore[field] = el.value !== '' ? parseInt(el.value) : null;
        this.recalcLegWon(l);
      } else if (field === 'handicap') {
        l.prediction.handicap = parseInt(el.value) || 0;
        this.recalcLegWon(l);
      } else if (field === 'halffull') {
        l.actualHalffull = el.value || null;
        if (l.betType === 'half_full') {
          l.won = el.value ? l.prediction.halffull === el.value : null;
        }
      }
    }
    this.renderParlayLegs();
    this.updateParlaySummary();
  },

  countMatches(legs) {
    const matches = new Set(legs.map(l => `${l.matchDate}_${l.homeTeam}_${l.awayTeam}`));
    return matches.size;
  },

  calcLegCombinations(legs) {
    const groups = {};
    for (const l of legs) {
      const key = `${l.matchDate}_${l.homeTeam}_${l.awayTeam}`;
      groups[key] = (groups[key] || 0) + 1;
    }
    return Object.values(groups).reduce((acc, n) => acc * n, 1);
  },

  calcCombinedOdds(legs, settled) {
    const groups = {};
    for (const l of legs) {
      const key = `${l.matchDate}_${l.homeTeam}_${l.awayTeam}`;
      if (settled) {
        if (l.won && (!groups[key] || l.odds > groups[key])) groups[key] = l.odds;
      } else {
        if (!groups[key] || l.odds > groups[key]) groups[key] = l.odds;
      }
    }
    const vals = Object.values(groups);
    if (vals.length === 0) return 0;
    return vals.reduce((acc, o) => acc * o, 1);
  },

  updateParlaySummary() {
    const summary = document.getElementById('parlay-summary');
    const matchCount = this.countMatches(this.parlayLegs);
    if (matchCount < 2) {
      summary.style.display = 'none';
      return;
    }

    summary.style.display = 'block';
    const combinedOdds = this.calcCombinedOdds(this.parlayLegs, false);
    const amount = parseFloat(document.getElementById('parlay-amount').value) || 0;

    document.getElementById('parlay-type-label').textContent = `${matchCount}串1`;
    document.getElementById('parlay-combined-odds').textContent = `×${combinedOdds.toFixed(2)}`;

    if (amount > 0) {
      const combos = this.calcLegCombinations(this.parlayLegs);
      const perLeg = amount / combos;
      const payout = Math.round(perLeg * combinedOdds);
      const profit = Math.round(payout - amount);
      document.getElementById('parlay-potential-payout').textContent = `¥${payout} (profit: ¥${profit}, 每注¥${perLeg.toFixed(1)}×${combos}注)`;
    } else {
      document.getElementById('parlay-potential-payout').textContent = '-';
    }
  },

  saveParlay() {
    const matchCount = this.countMatches(this.parlayLegs);
    if (matchCount < 2) {
      this.showToast('Parlay needs at least 2 different matches', 'error');
      return;
    }

    const amount = parseFloat(document.getElementById('parlay-amount').value);
    if (!amount || amount <= 0) {
      this.showToast('Please enter a bet amount', 'error');
      return;
    }

    const legs = JSON.parse(JSON.stringify(this.parlayLegs));
    const maxOdds = this.calcCombinedOdds(legs, false);
    const allSettled = legs.every(l => l.actualScore !== null || l.actualHalffull);

    const matchGroups = {};
    for (const l of legs) {
      const key = `${l.matchDate}_${l.homeTeam}_${l.awayTeam}`;
      if (!matchGroups[key]) matchGroups[key] = [];
      matchGroups[key].push(l);
    }
    const allWon = allSettled && Object.values(matchGroups).every(group => group.some(l => l.won === true));
    const settledOdds = allSettled ? this.calcCombinedOdds(legs, true) : 0;
    const combinedOdds = allSettled ? settledOdds : maxOdds;

    const id = this.editingParlayId ||
      (this.parlays.length > 0 ? Math.max(...this.parlays.map(p => p.id)) + 1 : 1001);

    const legCount = this.calcLegCombinations(legs);
    const totalCost = amount;
    const perLeg = amount / legCount;

    const parlay = {
      id,
      type: 'parlay',
      legs,
      matchCount,
      combinedOdds: parseFloat(combinedOdds.toFixed(4)),
      amount,
      legCount,
      totalCost,
      payout: allSettled ? (allWon ? Math.round(perLeg * combinedOdds) : 0) : 0,
      profit: allSettled ? (allWon ? Math.round(perLeg * combinedOdds - totalCost) : -totalCost) : 0,
      status: allSettled ? 'settled' : 'pending',
      confidence: document.getElementById('parlay-confidence').value,
      notes: document.getElementById('parlay-notes').value,
    };

    if (this.editingParlayId) {
      const idx = this.parlays.findIndex(p => p.id === this.editingParlayId);
      if (idx !== -1) this.parlays[idx] = parlay;
    } else {
      this.parlays.push(parlay);
    }

    this.saveParlays();
    this.closeModal();
    this.render();
    this.showToast(`Parlay saved (${matchCount}串1)`, 'success');
  },

  deleteParlay() {
    if (this.editingParlayId && confirm('Delete this parlay?')) {
      this.parlays = this.parlays.filter(p => p.id !== this.editingParlayId);
      this.saveParlays();
      this.closeModal();
      this.render();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
