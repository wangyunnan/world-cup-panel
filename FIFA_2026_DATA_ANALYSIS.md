# FIFA World Cup 2026 - Data Analysis Report

## Website Structure

**Base URL**: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026

**Architecture**: Client-side rendered Single Page Application (SPA)
- Framework: React
- HTML: Minimal shell with `<div id="root"></div>`
- All content loaded via JavaScript bundle: `/static/js/main.5b524752.js`
- No server-side rendering or `__NEXT_DATA__` blocks

## API Endpoints

### Primary API v3 (Matches & Data)
**Base**: `https://api.fifa.com/api/v3/`

#### Key Competition/Season IDs
- **Competition ID**: `17` (FIFA World Cup)
- **Season ID for 2026**: `285023`
- Season ID for 2022 Qatar: `255711` (reference)

#### Match Schedule Endpoint
```
GET https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&count=200&language=en
```

**Response**: JSON with array of match objects
- Total matches: **104 matches**
- Date range: June 11, 2026 to July 19, 2026
- Fields include: Date, Home/Away teams, Score, Stadium, Stage, Group, Officials, etc.

#### Live Football Endpoint
```
GET https://api.fifa.com/api/v3/live/football?idCompetition=17&language=en&count=10
```

### CXM API (Content Management)
**Base**: `https://cxm-api.fifa.com/fifaplusweb/api/`

Used by the website for page content and structured data.

## National Team Flags

### Flag Icon URL Pattern
**Base URL**: `https://api.fifa.com/api/v3/picture/flags-{format}-{size}/{COUNTRY_CODE}`

### Format & Size Parameters

#### Format: `sq` (Square flags - WORKING)
The website uses **`sq` format** exclusively, replacing the template `{format}-{size}` with combined strings like `sq-2`, `sq-4`, etc.

**Available sizes** (PNG format):
- `flags-sq-1`: **42×28px** (2,465 bytes)
- `flags-sq-2`: **70×46px** (5,945 bytes)
- `flags-sq-3`: **150×100px** (13,514 bytes)
- `flags-sq-4`: **250×167px** (24,723 bytes)
- `flags-sq-5`: **500×333px** (57,095 bytes)

**Aspect ratio**: ~3:2 (rectangular flags cropped to square frame)

#### Other Formats (NOT WORKING)
- `flags-round-{size}`: Returns 200 but empty (0 bytes)
- `flags-rect-{size}`: Returns 200 but empty (0 bytes)
- `flags-fwc2026-{size}`: Returns 200 but empty (0 bytes)

#### SVG Format
Not available - requesting `.svg` extension returns 404

### Flag URL Examples
```
# USA flag, medium size
https://api.fifa.com/api/v3/picture/flags-sq-3/USA

# Brazil flag, large size
https://api.fifa.com/api/v3/picture/flags-sq-4/BRA

# Germany flag, extra large
https://api.fifa.com/api/v3/picture/flags-sq-5/GER
```

### JavaScript Implementation (from website source)
```javascript
// Website replaces the template like this:
pictureUrl.replace("{format}-{size}", "sq-4")
// Example: "flags-{format}-{size}/BRA" becomes "flags-sq-4/BRA"
```

## Tournament Structure

### Total Teams: 48
Organized into 12 groups (A through L) with 4 teams each.

### Groups

**Group A**: Mexico (MEX), South Africa (RSA), Korea Republic (KOR), Czechia (CZE)

**Group B**: Canada (CAN), Bosnia and Herzegovina (BIH), Qatar (QAT), Switzerland (SUI)

**Group C**: Brazil (BRA), Morocco (MAR), Haiti (HAI), Scotland (SCO)

**Group D**: USA (USA), Paraguay (PAR), Australia (AUS), Türkiye (TUR)

**Group E**: Germany (GER), Côte d'Ivoire (CIV), Ecuador (ECU), Curaçao (CUW)

**Group F**: Netherlands (NED), Japan (JPN), Sweden (SWE), Tunisia (TUN)

**Group G**: Belgium (BEL), Egypt (EGY), IR Iran (IRN), New Zealand (NZL)

**Group H**: Spain (ESP), Uruguay (URU), Saudi Arabia (KSA), Cabo Verde (CPV)

**Group I**: France (FRA), Senegal (SEN), Norway (NOR), Iraq (IRQ)

**Group J**: Argentina (ARG), Austria (AUT), Algeria (ALG), Jordan (JOR)

**Group K**: Portugal (POR), Colombia (COL), Congo DR (COD), Uzbekistan (UZB)

**Group L**: England (ENG), Croatia (CRO), Ghana (GHA), Panama (PAN)

### All 48 Teams with Country Codes

| Code | Country | Flag URL Template |
|------|---------|-------------------|
| ALG | Algeria | `flags-sq-{size}/ALG` |
| ARG | Argentina | `flags-sq-{size}/ARG` |
| AUS | Australia | `flags-sq-{size}/AUS` |
| AUT | Austria | `flags-sq-{size}/AUT` |
| BEL | Belgium | `flags-sq-{size}/BEL` |
| BIH | Bosnia and Herzegovina | `flags-sq-{size}/BIH` |
| BRA | Brazil | `flags-sq-{size}/BRA` |
| CAN | Canada | `flags-sq-{size}/CAN` |
| CIV | Côte d'Ivoire | `flags-sq-{size}/CIV` |
| COD | Congo DR | `flags-sq-{size}/COD` |
| COL | Colombia | `flags-sq-{size}/COL` |
| CPV | Cabo Verde | `flags-sq-{size}/CPV` |
| CRO | Croatia | `flags-sq-{size}/CRO` |
| CUW | Curaçao | `flags-sq-{size}/CUW` |
| CZE | Czechia | `flags-sq-{size}/CZE` |
| ECU | Ecuador | `flags-sq-{size}/ECU` |
| EGY | Egypt | `flags-sq-{size}/EGY` |
| ENG | England | `flags-sq-{size}/ENG` |
| ESP | Spain | `flags-sq-{size}/ESP` |
| FRA | France | `flags-sq-{size}/FRA` |
| GER | Germany | `flags-sq-{size}/GER` |
| GHA | Ghana | `flags-sq-{size}/GHA` |
| HAI | Haiti | `flags-sq-{size}/HAI` |
| IRN | IR Iran | `flags-sq-{size}/IRN` |
| IRQ | Iraq | `flags-sq-{size}/IRQ` |
| JOR | Jordan | `flags-sq-{size}/JOR` |
| JPN | Japan | `flags-sq-{size}/JPN` |
| KOR | Korea Republic | `flags-sq-{size}/KOR` |
| KSA | Saudi Arabia | `flags-sq-{size}/KSA` |
| MAR | Morocco | `flags-sq-{size}/MAR` |
| MEX | Mexico | `flags-sq-{size}/MEX` |
| NED | Netherlands | `flags-sq-{size}/NED` |
| NOR | Norway | `flags-sq-{size}/NOR` |
| NZL | New Zealand | `flags-sq-{size}/NZL` |
| PAN | Panama | `flags-sq-{size}/PAN` |
| PAR | Paraguay | `flags-sq-{size}/PAR` |
| POR | Portugal | `flags-sq-{size}/POR` |
| QAT | Qatar | `flags-sq-{size}/QAT` |
| RSA | South Africa | `flags-sq-{size}/RSA` |
| SCO | Scotland | `flags-sq-{size}/SCO` |
| SEN | Senegal | `flags-sq-{size}/SEN` |
| SUI | Switzerland | `flags-sq-{size}/SUI` |
| SWE | Sweden | `flags-sq-{size}/SWE` |
| TUN | Tunisia | `flags-sq-{size}/TUN` |
| TUR | Türkiye | `flags-sq-{size}/TUR` |
| URU | Uruguay | `flags-sq-{size}/URU` |
| USA | USA | `flags-sq-{size}/USA` |
| UZB | Uzbekistan | `flags-sq-{size}/UZB` |

## Match Schedule

### Tournament Stages

| Stage | Matches |
|-------|---------|
| First Stage (Group Stage) | 72 |
| Round of 32 | 16 |
| Round of 16 | 8 |
| Quarter-final | 4 |
| Semi-final | 2 |
| Play-off for third place | 1 |
| Final | 1 |
| **TOTAL** | **104** |

### Schedule Overview
- **First match**: June 11, 2026 at 19:00 UTC
  - Mexico vs South Africa (Group A)
  - Venue: Mexico City Stadium, Mexico City
  
- **Final**: July 19, 2026 at 19:00 UTC

### Sample Group Stage Matches (First 10)

1. **June 11, 19:00 UTC** - Mexico vs South Africa (Group A) - Mexico City
2. **June 12, 02:00 UTC** - Korea Republic vs Czechia (Group A) - Guadalajara
3. **June 12, 19:00 UTC** - Canada vs Bosnia and Herzegovina (Group B) - Toronto
4. **June 13, 01:00 UTC** - USA vs Paraguay (Group D) - Los Angeles
5. **June 13, 19:00 UTC** - Qatar vs Switzerland (Group B) - San Francisco Bay Area
6. **June 13, 22:00 UTC** - Brazil vs Morocco (Group C) - New York/New Jersey
7. **June 14, 01:00 UTC** - Haiti vs Scotland (Group C) - Boston
8. **June 14, 04:00 UTC** - Australia vs Türkiye (Group D) - Vancouver
9. **June 14, 17:00 UTC** - Germany vs Curaçao (Group E) - Houston
10. **June 14, 20:00 UTC** - Netherlands vs Japan (Group F) - Dallas

### Knockout Stage Format
Matches use placeholder codes for teams:
- `1A`, `2B` = Winner/Runner-up of Group A/B
- `3ABCDF` = 3rd place team from specific groups (based on ranking)

Example: Round of 32
- Match 73: 2A vs 2B (Los Angeles)
- Match 76: 1C vs 2F (Houston)
- Match 74: 1E vs 3ABCDF (Boston)

## Venues (16 Host Cities)

### United States (11 cities)
- Atlanta Stadium, Atlanta
- Boston Stadium, Boston
- Dallas Stadium, Dallas
- Houston Stadium, Houston
- Kansas City Stadium, Kansas City
- Los Angeles Stadium, Los Angeles
- Miami Stadium, Miami
- New York/New Jersey Stadium, New Jersey
- Philadelphia Stadium, Philadelphia
- San Francisco Bay Area Stadium, San Francisco Bay Area
- Seattle Stadium, Seattle

### Mexico (3 cities)
- Guadalajara Stadium, Guadalajara
- Mexico City Stadium, Mexico City
- Monterrey Stadium, Monterrey

### Canada (2 cities)
- BC Place Vancouver, Vancouver
- Toronto Stadium, Toronto

## Match Data Structure

Each match object contains:
- **Identification**: IdMatch, IdCompetition, IdSeason, IdStage, IdGroup, MatchNumber
- **Teams**: Home/Away with Score, IdTeam, Abbreviation, TeamName, PictureUrl, IdCountry, Tactics
- **Scheduling**: Date (UTC), LocalDate, TimeDefined
- **Venue**: Stadium object with Name, IdCity, CityName, Capacity, Latitude/Longitude
- **Status**: MatchStatus, ResultType, OfficialityStatus, Winner
- **Officials**: Array with Referee and other officials
- **Metadata**: Attendance, Weather, BallPossession, PlaceHolderA/B (for knockout rounds)
- **Localization**: All text fields have Locale array (supports multiple languages)

### Example Match Object (Partial)
```json
{
  "IdMatch": "400021443",
  "Date": "2026-06-11T19:00:00Z",
  "Home": {
    "Score": 2,
    "IdTeam": "43911",
    "Abbreviation": "MEX",
    "TeamName": [{"Locale": "en-GB", "Description": "Mexico"}],
    "PictureUrl": "https://api.fifa.com/api/v3/picture/flags-{format}-{size}/MEX"
  },
  "Away": {
    "Score": 0,
    "Abbreviation": "RSA",
    "TeamName": [{"Locale": "en-GB", "Description": "South Africa"}],
    "PictureUrl": "https://api.fifa.com/api/v3/picture/flags-{format}-{size}/RSA"
  },
  "Stadium": {
    "Name": [{"Locale": "en-GB", "Description": "Mexico City Stadium"}],
    "CityName": [{"Locale": "en-GB", "Description": "Mexico City"}]
  },
  "GroupName": [{"Locale": "en-GB", "Description": "Group A"}],
  "StageName": [{"Locale": "en-GB", "Description": "First Stage"}]
}
```

## Recommendations for Implementation

### Flag Icons
1. **Use `flags-sq-3` (150×100px)** for general UI - good balance of quality and file size (~14KB)
2. **Use `flags-sq-2` (70×46px)** for small thumbnails/lists (~6KB)
3. **Use `flags-sq-4` (250×167px)** for larger displays like match cards (~25KB)
4. **Pre-cache all 48 flag images** (total ~660KB for sq-3 size)

### Match Data
1. **Fetch once and cache** - 104 matches in single API call
2. **Filter by date** for displaying today's/upcoming matches
3. **Use MatchStatus field** to determine live/completed/upcoming state
4. **Parse PlaceHolderA/B** for knockout stage bracket visualization

### Performance
- API responses are fast (~200-500ms)
- Enable cache headers (API returns Cache-Control)
- Consider polling live endpoint during match days

### Internationalization
All text fields return arrays with Locale/Description pairs. Currently returns "en-GB" locale.
To get other languages, change `language=en` parameter to desired language code.
