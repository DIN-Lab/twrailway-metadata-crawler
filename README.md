# Getting Started

## Requirements

- Node 10
- npm or yarn

## Setup

### Install dependencies

```
$ npm install
```

or 

```
$ yarn
```

### Required environment variables

| Name | Description |
|:----:|:----:|
| `GITHUB_ORG_NAME` | GitHub organization name for storing processed data. |
| `GITHUB_REPO_NAME` | GitHub repository name for storing processed data. | 
| `GITHUB_ACCESS_TOKEN` | GitHub access token with repository creation permission. |


### Start Parsing!

```
$ script/crawl
```

# Using Processed Data

Processed data will be pushed to a repository under the GitHub organization specified.

# Parameters

| Name | Description |
|:----:|:----:|
| `GITHUB_ORG_NAME` | Specified organization name. |
| `GITHUB_REPO_NAME` | Specified repository name. |
| `LANG_CODE` | Language code, either `en` or `zh`. |

## Areas

### Request URL

```
https://{GITHUB_ORG_NAME}.github.io/{GITHUB_REPO_NAME}/areas_{LANG_CODE}.json
```

### Data Format

```js
[
    "臺北/基隆地區",
    "桃園地區",
    "新竹地區",
    "苗栗地區",
    ...
]
```

## Stations

### Request URL

```
https://{GITHUB_ORG_NAME}.github.io/{GITHUB_REPO_NAME}/stations_{LANG_CODE}.json
```

### Data Format

```js
{
  "臺北/基隆地區": [
    {
        "OperatorID": "TRA",
        "ReservationCode": "083",
        "StationAddress": "新北市貢寮區福隆里福隆街2號",
        "StationClass": 3,
        "StationID": "1810",
        "StationName": {
          "En": "Fulong",
          "Zh_tw": "福隆"
        },
        "StationPhone": "02-24991800",
        "StationPosition": {
          "PositionLat": 25.015893,
          "PositionLon": 121.944659
        },
        "UpdateTime": "2017-06-26T17:38:15+08:00",
        "IsMainStationInArea": false
    }, 
    ...
  ],
  "桃園地區": [
    ...
  ],
  ...
}
```
