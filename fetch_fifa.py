#!/usr/bin/env python3
"""Fetch 2026 World Cup schedule and flag icons from FIFA API."""

import json
import os
import urllib.request
import urllib.error
import time

BASE = "https://api.fifa.com/api/v3"
COMP_ID = "17"
SEASON_ID = "285023"
FLAGS_DIR = "data/flags"
SCHEDULE_OUT = "data/schedule_fifa.json"
TEAMS_OUT = "data/teams.json"

# Chinese name -> FIFA country code mapping for all 48 teams
ZH_TO_CODE = {
    "墨西哥": "MEX", "南非": "RSA", "韩国": "KOR", "捷克": "CZE",
    "加拿大": "CAN", "波黑": "BIH", "卡塔尔": "QAT", "瑞士": "SUI",
    "巴西": "BRA", "摩洛哥": "MAR", "海地": "HAI", "苏格兰": "SCO",
    "美国": "USA", "巴拉圭": "PAR", "澳大利亚": "AUS", "土耳其": "TUR",
    "德国": "GER", "库拉索": "CUW", "科特迪瓦": "CIV", "厄瓜多尔": "ECU",
    "荷兰": "NED", "日本": "JPN", "瑞典": "SWE", "突尼斯": "TUN",
    "比利时": "BEL", "埃及": "EGY", "伊朗": "IRN", "新西兰": "NZL",
    "西班牙": "ESP", "佛得角": "CPV", "沙特": "KSA", "乌拉圭": "URU",
    "法国": "FRA", "塞内加尔": "SEN", "伊拉克": "IRQ", "挪威": "NOR",
    "阿根廷": "ARG", "阿尔及利": "ALG", "奥地利": "AUT", "约旦": "JOR",
    "葡萄牙": "POR", "民主刚果": "COD", "乌兹别克": "UZB", "哥伦比亚": "COL",
    "英格兰": "ENG", "克罗地亚": "CRO", "加纳": "GHA", "巴拿马": "PAN",
}

CODE_TO_ZH = {v: k for k, v in ZH_TO_CODE.items()}


def fetch_json(url):
    print(f"  Fetching: {url[:80]}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def download_flag(code, size=3):
    """Download flag PNG. size: 1=42x28, 2=70x46, 3=150x100, 4=250x167, 5=500x333"""
    out_path = os.path.join(FLAGS_DIR, f"{code}.png")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
        print(f"  [skip] {code}.png already exists")
        return True
    url = f"{BASE}/picture/flags-sq-{size}/{code}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            if len(data) < 100:
                print(f"  [warn] {code}.png too small ({len(data)} bytes), skipping")
                return False
            with open(out_path, "wb") as f:
                f.write(data)
            print(f"  [ok] {code}.png ({len(data)} bytes)")
            return True
    except Exception as e:
        print(f"  [err] {code}: {e}")
        return False


def fetch_schedule():
    url = (
        f"{BASE}/calendar/matches"
        f"?idCompetition={COMP_ID}&idSeason={SEASON_ID}"
        f"&count=200&language=en"
    )
    data = fetch_json(url)
    return data.get("Results", data) if isinstance(data, dict) else data


def parse_match(m):
    """Parse a single match from the FIFA API response."""
    home = m.get("Home", m.get("HomeTeam", {}))
    away = m.get("Away", m.get("AwayTeam", {}))

    home_code = ""
    away_code = ""
    home_name_en = ""
    away_name_en = ""

    if isinstance(home, dict):
        home_code = home.get("Abbreviation", home.get("IdCountry", ""))
        home_name_en = home.get("TeamName", [{}])
        if isinstance(home_name_en, list):
            home_name_en = home_name_en[0].get("Description", "") if home_name_en else ""
        elif isinstance(home_name_en, dict):
            home_name_en = home_name_en.get("Description", "")
    if isinstance(away, dict):
        away_code = away.get("Abbreviation", away.get("IdCountry", ""))
        away_name_en = away.get("TeamName", [{}])
        if isinstance(away_name_en, list):
            away_name_en = away_name_en[0].get("Description", "") if away_name_en else ""
        elif isinstance(away_name_en, dict):
            away_name_en = away_name_en.get("Description", "")

    stage_name = m.get("StageName", [{}])
    if isinstance(stage_name, list):
        stage_name = stage_name[0].get("Description", "") if stage_name else ""
    elif isinstance(stage_name, dict):
        stage_name = stage_name.get("Description", "")

    group_name = m.get("GroupName", [{}])
    if isinstance(group_name, list):
        group_name = group_name[0].get("Description", "") if group_name else ""
    elif isinstance(group_name, dict):
        group_name = group_name.get("Description", "")

    stadium = m.get("Stadium", {})
    venue = ""
    if isinstance(stadium, dict):
        venue_name = stadium.get("Name", [{}])
        if isinstance(venue_name, list):
            venue = venue_name[0].get("Description", "") if venue_name else ""
        elif isinstance(venue_name, dict):
            venue = venue_name.get("Description", "")
        city = stadium.get("CityName", [{}])
        if isinstance(city, list):
            city = city[0].get("Description", "") if city else ""
        elif isinstance(city, dict):
            city = city.get("Description", "")
        if city:
            venue = f"{venue}, {city}"

    date_str = m.get("Date", "")[:10]

    home_score = m.get("HomeTeamScore", None)
    away_score = m.get("AwayTeamScore", None)
    match_status = m.get("MatchStatus", 0)

    return {
        "matchId": m.get("IdMatch", ""),
        "date": date_str,
        "stageName": stage_name,
        "groupName": group_name,
        "homeCode": home_code,
        "awayCode": away_code,
        "homeNameEn": home_name_en,
        "awayNameEn": away_name_en,
        "homeNameZh": CODE_TO_ZH.get(home_code, home_name_en),
        "awayNameZh": CODE_TO_ZH.get(away_code, away_name_en),
        "venue": venue,
        "homeScore": home_score,
        "awayScore": away_score,
        "matchStatus": match_status,
    }


def main():
    os.makedirs(FLAGS_DIR, exist_ok=True)

    # 1. Download flags for all 48 teams
    print("=== Downloading flags ===")
    codes = sorted(set(ZH_TO_CODE.values()))
    ok_count = 0
    for code in codes:
        if download_flag(code):
            ok_count += 1
        time.sleep(0.2)
    print(f"\nFlags: {ok_count}/{len(codes)} downloaded\n")

    # 2. Fetch schedule
    print("=== Fetching schedule from FIFA API ===")
    try:
        raw = fetch_schedule()
        print(f"  Got {len(raw)} matches")
    except Exception as e:
        print(f"  Failed to fetch schedule: {e}")
        print("  Will use existing schedule.json")
        raw = []

    if raw:
        matches = [parse_match(m) for m in raw]
        with open(SCHEDULE_OUT, "w", encoding="utf-8") as f:
            json.dump(matches, f, ensure_ascii=False, indent=2)
        print(f"  Saved to {SCHEDULE_OUT}")

        # Extract unique teams
        teams = {}
        for m in matches:
            if m["homeCode"] and m["homeCode"] not in teams:
                teams[m["homeCode"]] = {
                    "code": m["homeCode"],
                    "nameEn": m["homeNameEn"],
                    "nameZh": m["homeNameZh"],
                    "flag": f"data/flags/{m['homeCode']}.png",
                }
            if m["awayCode"] and m["awayCode"] not in teams:
                teams[m["awayCode"]] = {
                    "code": m["awayCode"],
                    "nameEn": m["awayNameEn"],
                    "nameZh": m["awayNameZh"],
                    "flag": f"data/flags/{m['awayCode']}.png",
                }
        teams_list = sorted(teams.values(), key=lambda t: t["code"])
        with open(TEAMS_OUT, "w", encoding="utf-8") as f:
            json.dump(teams_list, f, ensure_ascii=False, indent=2)
        print(f"  Saved {len(teams_list)} teams to {TEAMS_OUT}")

    # 3. Save the mapping for the frontend
    mapping_path = "data/team_codes.json"
    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(ZH_TO_CODE, f, ensure_ascii=False, indent=2)
    print(f"  Saved team code mapping to {mapping_path}")

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
