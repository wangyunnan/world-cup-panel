const GitHub = {
  OWNER: 'wangyunnan',
  REPO: 'world-cup-panel',
  BRANCH: 'main',
  PATH: 'data/bets.json',

  getToken() {
    return localStorage.getItem('worldcup_github_token') || '';
  },

  saveToken(token) {
    localStorage.setItem('worldcup_github_token', token);
  },

  isConfigured() {
    return !!this.getToken();
  },

  async commitBets(bets, parlays) {
    const token = this.getToken();
    if (!token) throw new Error('Token not set');

    const content = JSON.stringify({
      meta: {
        tournament: '2026 FIFA World Cup',
        currency: 'CNY',
        startDate: '2026-06-11',
        location: 'USA / Canada / Mexico'
      },
      bets,
      parlays: parlays || []
    }, null, 2);

    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    let sha = null;
    try {
      const getRes = await fetch(
        `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.PATH}?ref=${this.BRANCH}`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      );
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }
    } catch (e) {
      // file doesn't exist yet
    }

    const body = {
      message: `Update bets (${new Date().toLocaleString('zh-CN')})`,
      content: encodedContent,
      branch: this.BRANCH
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(
      `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!putRes.ok) {
      const err = await putRes.json();
      throw new Error(err.message || `HTTP ${putRes.status}`);
    }

    return await putRes.json();
  },

  async pullBets() {
    const token = this.getToken();
    if (!token) throw new Error('Token not set');

    const res = await fetch(
      `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.PATH}?ref=${this.BRANCH}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );

    if (!res.ok) {
      if (res.status === 404) return null;
      const err = await res.json();
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    const fileData = await res.json();
    const decoded = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
    const data = JSON.parse(decoded);
    return { bets: data.bets || [], parlays: data.parlays || [] };
  }
};
