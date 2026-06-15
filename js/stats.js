const Stats = {
  calculate(bets, parlays) {
    parlays = parlays || [];
    const settled = bets.filter(b => b.status === 'settled');
    const wins = settled.filter(b => b.profit > 0);
    const losses = settled.filter(b => b.profit < 0);

    const parlaySettled = parlays.filter(p => p.status === 'settled');
    const parlayWins = parlaySettled.filter(p => p.profit > 0);

    const totalBets = bets.length + parlays.length;
    const totalWagered = bets.reduce((s, b) => s + b.amount, 0) + parlays.reduce((s, p) => s + p.amount, 0);
    const allSettledCount = settled.length + parlaySettled.length;
    const allWinsCount = wins.length + parlayWins.length;
    const settledWagered = settled.reduce((s, b) => s + b.amount, 0) + parlaySettled.reduce((s, p) => s + p.amount, 0);
    const totalProfit = settled.reduce((s, b) => s + b.profit, 0) + parlaySettled.reduce((s, p) => s + p.profit, 0);
    const winRate = allSettledCount > 0 ? (allWinsCount / allSettledCount * 100) : 0;
    const roi = settledWagered > 0 ? (totalProfit / settledWagered * 100) : 0;

    let streak = '-';
    if (settled.length > 0) {
      const sorted = [...settled].sort((a, b) => a.matchDate.localeCompare(b.matchDate));
      let count = 0;
      const lastResult = sorted[sorted.length - 1].profit > 0 ? 'W' : 'L';
      for (let i = sorted.length - 1; i >= 0; i--) {
        const r = sorted[i].profit > 0 ? 'W' : 'L';
        if (r === lastResult) count++;
        else break;
      }
      streak = `${count}${lastResult}`;
    }

    return { totalBets, totalWagered, totalProfit, winRate, roi, streak, settled, wins, losses };
  },

  renderDashboard(stats) {
    document.getElementById('stat-total-bets').textContent = stats.totalBets;
    document.getElementById('stat-total-wagered').textContent = `¥${stats.totalWagered}`;

    const profitEl = document.getElementById('stat-total-profit');
    profitEl.textContent = `${stats.totalProfit >= 0 ? '+' : ''}¥${stats.totalProfit}`;
    profitEl.className = `stat-value ${stats.totalProfit >= 0 ? 'positive' : 'negative'}`;

    document.getElementById('stat-win-rate').textContent = `${stats.winRate.toFixed(1)}%`;

    const roiEl = document.getElementById('stat-roi');
    roiEl.textContent = `${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`;
    roiEl.className = `stat-value ${stats.roi >= 0 ? 'positive' : 'negative'}`;

    document.getElementById('stat-streak').textContent = stats.streak;
  },

  renderProfitChart(bets) {
    const canvas = document.getElementById('chart-profit');
    const ctx = canvas.getContext('2d');
    const settled = bets.filter(b => b.status === 'settled')
      .sort((a, b) => a.matchDate.localeCompare(b.matchDate));

    if (settled.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#6b9b6e';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No settled bets yet', canvas.width / 2, canvas.height / 2);
      return;
    }

    const cumulative = [];
    let sum = 0;
    for (const b of settled) {
      sum += b.profit;
      cumulative.push(sum);
    }

    const w = canvas.width;
    const h = canvas.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    const maxVal = Math.max(...cumulative, 0);
    const minVal = Math.min(...cumulative, 0);
    const range = maxVal - minVal || 1;

    ctx.clearRect(0, 0, w, h);

    const zeroY = padding.top + plotH * (maxVal / range);
    ctx.strokeStyle = '#2d4a30';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(w - padding.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < cumulative.length; i++) {
      const x = padding.left + (i / (cumulative.length - 1 || 1)) * plotW;
      const y = padding.top + plotH * ((maxVal - cumulative[i]) / range);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    for (let i = 0; i < cumulative.length; i++) {
      const x = padding.left + (i / (cumulative.length - 1 || 1)) * plotW;
      const y = padding.top + plotH * ((maxVal - cumulative[i]) / range);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(padding.left + plotW, h - padding.bottom);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.closePath();
    ctx.fill();

    for (let i = 0; i < cumulative.length; i++) {
      const x = padding.left + (i / (cumulative.length - 1 || 1)) * plotW;
      const y = padding.top + plotH * ((maxVal - cumulative[i]) / range);
      ctx.fillStyle = cumulative[i] >= 0 ? '#66bb6a' : '#ef5350';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#6b9b6e';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`¥${maxVal}`, 4, padding.top + 10);
    ctx.fillText(`¥${minVal}`, 4, h - padding.bottom - 4);

    ctx.textAlign = 'center';
    for (let i = 0; i < settled.length; i++) {
      if (settled.length <= 10 || i % Math.ceil(settled.length / 6) === 0) {
        const x = padding.left + (i / (settled.length - 1 || 1)) * plotW;
        ctx.fillText(settled[i].matchDate.slice(5), x, h - padding.bottom + 15);
      }
    }
  },

  renderWinRateChart(bets) {
    const canvas = document.getElementById('chart-winrate');
    const ctx = canvas.getContext('2d');
    const settled = bets.filter(b => b.status === 'settled');

    const types = {};
    for (const b of settled) {
      if (!types[b.betType]) types[b.betType] = { wins: 0, total: 0 };
      types[b.betType].total++;
      if (b.profit > 0) types[b.betType].wins++;
    }

    const entries = Object.entries(types);
    if (entries.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#6b9b6e';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data', canvas.width / 2, canvas.height / 2);
      return;
    }

    const w = canvas.width;
    const h = canvas.height;
    const padding = { top: 20, right: 20, bottom: 50, left: 20 };
    const barWidth = Math.min(80, (w - padding.left - padding.right) / entries.length - 20);
    const plotH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const typeLabels = { result: '胜平负', score: '比分', total_goals: '总进球', half_full: '半全场' };

    entries.forEach(([type, data], i) => {
      const rate = data.total > 0 ? data.wins / data.total : 0;
      const x = padding.left + (i + 0.5) * ((w - padding.left - padding.right) / entries.length) - barWidth / 2;
      const barH = rate * plotH;
      const y = padding.top + plotH - barH;

      ctx.fillStyle = '#2d4a30';
      ctx.fillRect(x, padding.top, barWidth, plotH);

      ctx.fillStyle = rate >= 0.5 ? '#66bb6a' : '#ef5350';
      ctx.fillRect(x, y, barWidth, barH);

      ctx.fillStyle = '#e8f5e9';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${(rate * 100).toFixed(0)}%`, x + barWidth / 2, y - 6);

      ctx.fillStyle = '#6b9b6e';
      ctx.font = '11px sans-serif';
      ctx.fillText(typeLabels[type] || type, x + barWidth / 2, h - padding.bottom + 15);
      ctx.fillText(`(${data.wins}/${data.total})`, x + barWidth / 2, h - padding.bottom + 30);
    });
  },

  renderDistributionChart(bets) {
    const canvas = document.getElementById('chart-distribution');
    const ctx = canvas.getContext('2d');

    if (bets.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#6b9b6e';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data', canvas.width / 2, canvas.height / 2);
      return;
    }

    const buckets = [
      { label: '≤30', min: 0, max: 30, count: 0 },
      { label: '31-50', min: 31, max: 50, count: 0 },
      { label: '51-100', min: 51, max: 100, count: 0 },
      { label: '101-200', min: 101, max: 200, count: 0 },
      { label: '>200', min: 201, max: Infinity, count: 0 },
    ];

    for (const b of bets) {
      const bucket = buckets.find(bk => b.amount >= bk.min && b.amount <= bk.max);
      if (bucket) bucket.count++;
    }

    const w = canvas.width;
    const h = canvas.height;
    const padding = { top: 20, right: 20, bottom: 50, left: 20 };
    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    const barWidth = Math.min(60, (w - padding.left - padding.right) / buckets.length - 15);
    const plotH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    buckets.forEach((bucket, i) => {
      const barH = (bucket.count / maxCount) * plotH;
      const x = padding.left + (i + 0.5) * ((w - padding.left - padding.right) / buckets.length) - barWidth / 2;
      const y = padding.top + plotH - barH;

      ctx.fillStyle = '#ffd700';
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x, y, barWidth, barH);
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#e8f5e9';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      if (bucket.count > 0) {
        ctx.fillText(bucket.count, x + barWidth / 2, y - 6);
      }

      ctx.fillStyle = '#6b9b6e';
      ctx.font = '11px sans-serif';
      ctx.fillText(`¥${bucket.label}`, x + barWidth / 2, h - padding.bottom + 15);
    });
  },

  renderTeamStats(bets) {
    const container = document.getElementById('team-stats');
    const settled = bets.filter(b => b.status === 'settled');
    const teams = {};

    for (const b of settled) {
      if (b.betType === 'parlay') continue;
      [b.homeTeam, b.awayTeam].forEach(team => {
        if (!teams[team]) teams[team] = { bets: 0, wins: 0, profit: 0 };
      });
      let predictedTeam = null;
      if (b.predictionResult === 'home_win' || b.predictionResult === 'win') {
        predictedTeam = b.homeTeam;
      } else if (b.predictionResult === 'away_win' || b.predictionResult === 'lose') {
        predictedTeam = b.awayTeam;
      }
      if (predictedTeam) {
        teams[predictedTeam].bets++;
        if (b.profit > 0) teams[predictedTeam].wins++;
        teams[predictedTeam].profit += b.profit;
      }
    }

    // Include parlay legs
    const parlaySettled = bets.filter(b => b.betType === 'parlay' && b.status === 'settled');
    for (const b of parlaySettled) {
      if (!b._legs) continue;
      for (const leg of b._legs) {
        [leg.homeTeam, leg.awayTeam].forEach(team => {
          if (!teams[team]) teams[team] = { bets: 0, wins: 0, profit: 0 };
        });
        let predictedTeam = null;
        const pr = leg.predictionResult;
        if (pr === 'home_win' || pr === 'win') predictedTeam = leg.homeTeam;
        else if (pr === 'away_win' || pr === 'lose') predictedTeam = leg.awayTeam;
        if (predictedTeam) {
          teams[predictedTeam].bets++;
          if (leg.won) teams[predictedTeam].wins++;
        }
      }
    }

    const sorted = Object.entries(teams)
      .filter(([_, d]) => d.bets > 0)
      .sort((a, b) => b[1].profit - a[1].profit);

    if (sorted.length === 0) {
      container.innerHTML = '<div style="color:#6b9b6e;text-align:center;padding:2rem;">No team data yet</div>';
      return;
    }

    const maxProfit = Math.max(...sorted.map(([_, d]) => Math.abs(d.profit)), 1);

    container.innerHTML = sorted.map(([team, data]) => {
      const winRate = data.bets > 0 ? (data.wins / data.bets * 100).toFixed(0) : 0;
      const barWidth = Math.abs(data.profit) / maxProfit * 100;
      const barColor = data.profit >= 0 ? 'var(--color-win)' : 'var(--color-lose)';
      return `
        <div class="team-stat-row">
          <span style="min-width:80px">${team}</span>
          <div class="team-stat-bar">
            <div class="team-stat-bar-fill" style="width:${barWidth}%;background:${barColor}"></div>
          </div>
          <span style="min-width:60px;text-align:right;color:${barColor}">
            ${data.profit >= 0 ? '+' : ''}¥${data.profit}
          </span>
          <span style="min-width:40px;text-align:right;color:var(--text-muted);font-size:0.75rem">
            ${winRate}%
          </span>
        </div>
      `;
    }).join('');
  },

  renderAll(bets, parlays) {
    parlays = parlays || [];
    const parlayAsBets = parlays.map(p => ({
      matchDate: p.legs[0] ? p.legs[0].matchDate : '',
      betType: 'parlay',
      amount: p.amount,
      profit: p.profit,
      status: p.status,
      homeTeam: p.legs.map(l => l.homeTeam).join('/'),
      awayTeam: p.legs.map(l => l.awayTeam).join('/'),
      predictionResult: null,
      _legs: p.legs
    }));
    const allBets = [...bets, ...parlayAsBets];
    const stats = this.calculate(bets, parlays);
    this.renderDashboard(stats);
    this.renderProfitChart(allBets);
    this.renderWinRateChart(allBets);
    this.renderDistributionChart(allBets);
    this.renderTeamStats(allBets);
  }
};
