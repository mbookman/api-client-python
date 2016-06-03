"""
Copyright 2016 Google Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

# Provides a list of reference segment names and lengths.
# Supported:
#    GRCh38
#      reference_segments: all segments
#      common_segments: '1' .. '22', 'X', 'Y', 'MT'

def get_reference_segment(name, segment_list):
  """Search a list of segments by name"""
  for segment in segment_list:
    if segment['name'] == name:
      return segment

  return None

# The GRCh38 reference segment names and lengths are captured from:
#
#   gcloud alpha genomics references list \
#     --reference-set-id EMud_c37lKPXTQ \
#     --format 'json(name,length)'

GRCh38 = {
  'reference_segments': [
    {
      "length": "40176",
      "name": "KI270710.1"
    },
    {
      "length": "1361",
      "name": "KI270429.1"
    },
    {
      "length": "1484",
      "name": "KI270391.1"
    },
    {
      "length": "80373285",
      "name": "18"
    },
    {
      "length": "1652",
      "name": "KI270330.1"
    },
    {
      "length": "112505",
      "name": "KI270438.1"
    },
    {
      "length": "91309",
      "name": "KI270538.1"
    },
    {
      "length": "137718",
      "name": "GL000214.1"
    },
    {
      "length": "981",
      "name": "KI270423.1"
    },
    {
      "length": "1774",
      "name": "KI270465.1"
    },
    {
      "length": "57227415",
      "name": "Y"
    },
    {
      "length": "41543",
      "name": "KI270732.1"
    },
    {
      "length": "100316",
      "name": "KI270721.1"
    },
    {
      "length": "248956422",
      "name": "1"
    },
    {
      "length": "176043",
      "name": "KI270712.1"
    },
    {
      "length": "998",
      "name": "KI270312.1"
    },
    {
      "length": "27745",
      "name": "KI270752.1"
    },
    {
      "length": "6361",
      "name": "KI270515.1"
    },
    {
      "length": "175055",
      "name": "KI270706.1"
    },
    {
      "length": "186739",
      "name": "KI270742.1"
    },
    {
      "length": "1750",
      "name": "KI270383.1"
    },
    {
      "length": "38054",
      "name": "KI270718.1"
    },
    {
      "length": "3041",
      "name": "KI270593.1"
    },
    {
      "length": "92689",
      "name": "GL000208.1"
    },
    {
      "length": "2165",
      "name": "KI270304.1"
    },
    {
      "length": "2805",
      "name": "KI270371.1"
    },
    {
      "length": "3253",
      "name": "KI270517.1"
    },
    {
      "length": "71251",
      "name": "KI270757.1"
    },
    {
      "length": "16569",
      "name": "MT"
    },
    {
      "length": "22689",
      "name": "KI270512.1"
    },
    {
      "length": "172810",
      "name": "KI270725.1"
    },
    {
      "length": "194050",
      "name": "KI270722.1"
    },
    {
      "length": "1029",
      "name": "KI270419.1"
    },
    {
      "length": "62944",
      "name": "KI270753.1"
    },
    {
      "length": "12399",
      "name": "KI270311.1"
    },
    {
      "length": "138126",
      "name": "KI270519.1"
    },
    {
      "length": "42210",
      "name": "KI270711.1"
    },
    {
      "length": "103838",
      "name": "KI270737.1"
    },
    {
      "length": "37690",
      "name": "KI270317.1"
    },
    {
      "length": "157432",
      "name": "KI270741.1"
    },
    {
      "length": "392061",
      "name": "KI270442.1"
    },
    {
      "length": "1803",
      "name": "KI270363.1"
    },
    {
      "length": "2274",
      "name": "KI270302.1"
    },
    {
      "length": "1537",
      "name": "KI270387.1"
    },
    {
      "length": "990",
      "name": "KI270385.1"
    },
    {
      "length": "211173",
      "name": "GL000225.1"
    },
    {
      "length": "3530",
      "name": "KI270362.1"
    },
    {
      "length": "32032",
      "name": "KI270707.1"
    },
    {
      "length": "198295559",
      "name": "3"
    },
    {
      "length": "38115",
      "name": "KI270723.1"
    },
    {
      "length": "4055",
      "name": "KI270468.1"
    },
    {
      "length": "1930",
      "name": "KI270381.1"
    },
    {
      "length": "1951",
      "name": "KI270508.1"
    },
    {
      "length": "159345973",
      "name": "7"
    },
    {
      "length": "2321",
      "name": "KI270420.1"
    },
    {
      "length": "1884",
      "name": "KI270425.1"
    },
    {
      "length": "971",
      "name": "KI270392.1"
    },
    {
      "length": "1472",
      "name": "KI270305.1"
    },
    {
      "length": "1233",
      "name": "KI270466.1"
    },
    {
      "length": "1788",
      "name": "KI270386.1"
    },
    {
      "length": "1880",
      "name": "KI270396.1"
    },
    {
      "length": "2276",
      "name": "KI270315.1"
    },
    {
      "length": "1942",
      "name": "KI270303.1"
    },
    {
      "length": "73985",
      "name": "KI270739.1"
    },
    {
      "length": "1136",
      "name": "KI270376.1"
    },
    {
      "length": "1040",
      "name": "KI270329.1"
    },
    {
      "length": "1300",
      "name": "KI270516.1"
    },
    {
      "length": "155397",
      "name": "GL000221.1"
    },
    {
      "length": "2140",
      "name": "KI270424.1"
    },
    {
      "length": "153799",
      "name": "KI270716.1"
    },
    {
      "length": "190214555",
      "name": "4"
    },
    {
      "length": "242193529",
      "name": "2"
    },
    {
      "length": "112551",
      "name": "KI270730.1"
    },
    {
      "length": "2168",
      "name": "KI270530.1"
    },
    {
      "length": "1658",
      "name": "KI270384.1"
    },
    {
      "length": "1368",
      "name": "KI270334.1"
    },
    {
      "length": "99375",
      "name": "KI270738.1"
    },
    {
      "length": "36723",
      "name": "KI270755.1"
    },
    {
      "length": "1400",
      "name": "KI270583.1"
    },
    {
      "length": "101991189",
      "name": "15"
    },
    {
      "length": "90338345",
      "name": "16"
    },
    {
      "length": "161802",
      "name": "GL000220.1"
    },
    {
      "length": "4685",
      "name": "KI270590.1"
    },
    {
      "length": "170805979",
      "name": "6"
    },
    {
      "length": "182896",
      "name": "GL000195.1"
    },
    {
      "length": "2186",
      "name": "KI270518.1"
    },
    {
      "length": "5796",
      "name": "KI270591.1"
    },
    {
      "length": "179198",
      "name": "GL000219.1"
    },
    {
      "length": "179693",
      "name": "GL000224.1"
    },
    {
      "length": "176845",
      "name": "KI270719.1"
    },
    {
      "length": "1048",
      "name": "KI270378.1"
    },
    {
      "length": "164239",
      "name": "GL000213.1"
    },
    {
      "length": "41717",
      "name": "KI270714.1"
    },
    {
      "length": "1428",
      "name": "KI270340.1"
    },
    {
      "length": "4513",
      "name": "KI270584.1"
    },
    {
      "length": "8127",
      "name": "KI270511.1"
    },
    {
      "length": "107043718",
      "name": "14"
    },
    {
      "length": "970",
      "name": "KI270394.1"
    },
    {
      "length": "1048",
      "name": "KI270335.1"
    },
    {
      "length": "150742",
      "name": "KI270751.1"
    },
    {
      "length": "198735",
      "name": "KI270747.1"
    },
    {
      "length": "1026",
      "name": "KI270336.1"
    },
    {
      "length": "148850",
      "name": "KI270750.1"
    },
    {
      "length": "83257441",
      "name": "17"
    },
    {
      "length": "2145",
      "name": "KI270418.1"
    },
    {
      "length": "64444167",
      "name": "20"
    },
    {
      "length": "93321",
      "name": "KI270748.1"
    },
    {
      "length": "15008",
      "name": "GL000226.1"
    },
    {
      "length": "5353",
      "name": "KI270507.1"
    },
    {
      "length": "191469",
      "name": "GL000194.1"
    },
    {
      "length": "161147",
      "name": "GL000218.1"
    },
    {
      "length": "7642",
      "name": "KI270521.1"
    },
    {
      "length": "6158",
      "name": "KI270588.1"
    },
    {
      "length": "44474",
      "name": "KI270589.1"
    },
    {
      "length": "1872759",
      "name": "KI270728.1"
    },
    {
      "length": "158759",
      "name": "KI270749.1"
    },
    {
      "length": "145138636",
      "name": "8"
    },
    {
      "length": "2489",
      "name": "KI270414.1"
    },
    {
      "length": "133275309",
      "name": "12"
    },
    {
      "length": "1599",
      "name": "KI270548.1"
    },
    {
      "length": "2656",
      "name": "KI270374.1"
    },
    {
      "length": "1201",
      "name": "KI270310.1"
    },
    {
      "length": "2983",
      "name": "KI270528.1"
    },
    {
      "length": "3920",
      "name": "KI270467.1"
    },
    {
      "length": "181920",
      "name": "KI270736.1"
    },
    {
      "length": "156040895",
      "name": "X"
    },
    {
      "length": "210658",
      "name": "KI270743.1"
    },
    {
      "length": "138394717",
      "name": "9"
    },
    {
      "length": "1428",
      "name": "KI270338.1"
    },
    {
      "length": "1444",
      "name": "KI270316.1"
    },
    {
      "length": "2387",
      "name": "KI270390.1"
    },
    {
      "length": "39555",
      "name": "KI270724.1"
    },
    {
      "length": "165050",
      "name": "KI270734.1"
    },
    {
      "length": "209709",
      "name": "GL000008.2"
    },
    {
      "length": "127682",
      "name": "KI270708.1"
    },
    {
      "length": "39050",
      "name": "KI270720.1"
    },
    {
      "length": "40745",
      "name": "KI270713.1"
    },
    {
      "length": "1216",
      "name": "KI270388.1"
    },
    {
      "length": "2969",
      "name": "KI270587.1"
    },
    {
      "length": "150754",
      "name": "KI270731.1"
    },
    {
      "length": "1045",
      "name": "KI270379.1"
    },
    {
      "length": "135086622",
      "name": "11"
    },
    {
      "length": "5674",
      "name": "KI270522.1"
    },
    {
      "length": "185591",
      "name": "GL000205.2"
    },
    {
      "length": "1202",
      "name": "KI270544.1"
    },
    {
      "length": "79590",
      "name": "KI270756.1"
    },
    {
      "length": "40191",
      "name": "KI270754.1"
    },
    {
      "length": "280839",
      "name": "KI270729.1"
    },
    {
      "length": "58617616",
      "name": "19"
    },
    {
      "length": "7992",
      "name": "KI270448.1"
    },
    {
      "length": "2415",
      "name": "KI270510.1"
    },
    {
      "length": "181538259",
      "name": "5"
    },
    {
      "length": "42811",
      "name": "KI270735.1"
    },
    {
      "length": "2043",
      "name": "KI270417.1"
    },
    {
      "length": "2699",
      "name": "KI270333.1"
    },
    {
      "length": "114364328",
      "name": "13"
    },
    {
      "length": "176608",
      "name": "GL000216.2"
    },
    {
      "length": "1121",
      "name": "KI270337.1"
    },
    {
      "length": "1899",
      "name": "KI270529.1"
    },
    {
      "length": "1445",
      "name": "KI270422.1"
    },
    {
      "length": "2646",
      "name": "KI270411.1"
    },
    {
      "length": "41891",
      "name": "KI270745.1"
    },
    {
      "length": "179772",
      "name": "KI270733.1"
    },
    {
      "length": "37240",
      "name": "KI270740.1"
    },
    {
      "length": "1553",
      "name": "KI270580.1"
    },
    {
      "length": "161471",
      "name": "KI270715.1"
    },
    {
      "length": "1451",
      "name": "KI270373.1"
    },
    {
      "length": "46709983",
      "name": "21"
    },
    {
      "length": "92983",
      "name": "KI270435.1"
    },
    {
      "length": "448248",
      "name": "KI270727.1"
    },
    {
      "length": "4215",
      "name": "KI270382.1"
    },
    {
      "length": "1179",
      "name": "KI270412.1"
    },
    {
      "length": "40062",
      "name": "KI270717.1"
    },
    {
      "length": "31033",
      "name": "KI270579.1"
    },
    {
      "length": "43739",
      "name": "KI270726.1"
    },
    {
      "length": "1298",
      "name": "KI270389.1"
    },
    {
      "length": "4416",
      "name": "KI270320.1"
    },
    {
      "length": "2855",
      "name": "KI270364.1"
    },
    {
      "length": "66486",
      "name": "KI270746.1"
    },
    {
      "length": "6504",
      "name": "KI270582.1"
    },
    {
      "length": "8320",
      "name": "KI270366.1"
    },
    {
      "length": "1650",
      "name": "KI270372.1"
    },
    {
      "length": "133797422",
      "name": "10"
    },
    {
      "length": "66860",
      "name": "KI270709.1"
    },
    {
      "length": "1308",
      "name": "KI270393.1"
    },
    {
      "length": "1143",
      "name": "KI270395.1"
    },
    {
      "length": "2378",
      "name": "KI270375.1"
    },
    {
      "length": "2318",
      "name": "KI270509.1"
    },
    {
      "length": "993",
      "name": "KI270539.1"
    },
    {
      "length": "7046",
      "name": "KI270581.1"
    },
    {
      "length": "50818468",
      "name": "22"
    },
    {
      "length": "201709",
      "name": "GL000009.2"
    },
    {
      "length": "21476",
      "name": "KI270322.1"
    },
    {
      "length": "168472",
      "name": "KI270744.1"
    }
  ]
}

GRCh38['common_segments'] = [
  get_reference_segment(str(name), GRCh38['reference_segments'])
  for name in range(1,22 + 1) + [ 'X', 'Y', 'MT' ]
]
