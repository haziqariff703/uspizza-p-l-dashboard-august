import { OriginalOutlet } from '../types';

/**
 * The original dashboard's own per-outlet dataset, extracted verbatim from the
 * React Flight payload embedded in original.html (44 trading outlets, May 2026).
 *
 * Floats are kept byte-exact so aggregates match the original to the cent.
 * Every Overview figure derives from these records — see src/data/aggregate.ts.
 * Do not hand-edit; re-extract from original.html if it is ever recaptured.
 */
export const ORIGINAL_OUTLETS: OriginalOutlet[] = [
  {
    "code": "MY-030",
    "name": "Dpulze Cyberjaya",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 206521.0200000009,
      "net": 152580.8400000001,
      "netSC": 154449.10000000012,
      "netSCTax": 163865.9099999999
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 77742.17000000027,
        "net": 61442.200000000026,
        "netSC": 61442.200000000026,
        "netSCTax": 65129.41999999995
      },
      "foodpanda": {
        "grossMenu": 37512.7,
        "net": 27055.860000000062,
        "netSC": 27055.860000000062,
        "netSCTax": 28678.61
      },
      "shopee": {
        "grossMenu": 44802.79000000002,
        "net": 28057.95999999998,
        "netSC": 28057.95999999998,
        "netSCTax": 29741.479999999945
      },
      "apps": {
        "grossMenu": 12271.85999999994,
        "net": 9523.639999999954,
        "netSC": 9869.63999999997,
        "netSCTax": 10703.250000000007
      },
      "pos": {
        "grossMenu": 34191.50000000064,
        "net": 26501.180000000088,
        "netSC": 28023.44000000009,
        "netSCTax": 29613.150000000005
      }
    },
    "payout": {
      "grab": 45349.24000000005,
      "foodpanda": 22793.279999999973,
      "shopee": 23346.58,
      "apps": 10564.322948662517,
      "pos": 29613.150000000005
    },
    "fees": {
      "grab": {
        "commission": 18299.910000000007,
        "advertising": 2963.4499999999994,
        "platformFees": 902.5499999999968,
        "gateway": 0,
        "adjustments": 33.56
      },
      "foodpanda": {
        "commission": 5906.019999999998,
        "advertising": 1899.89,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": -1274.89
      },
      "shopee": {
        "commission": 5858.52000000001,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 222.15
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 138.9270513374904,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 75909.43,
    "netAfterCommission": 131666.57294866254,
    "commission": 20914.267051337574,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-076",
    "name": "Vivacity Kuching",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 171072.2399999994,
      "net": 145251.24999999985,
      "netSC": 150780.75999999943,
      "netSCTax": 160697.80000000013
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 33403.21000000001,
        "net": 28178.10000000002,
        "netSC": 28178.10000000002,
        "netSCTax": 29868.88999999999
      },
      "foodpanda": {
        "grossMenu": 9586.390000000005,
        "net": 7223.240000000001,
        "netSC": 7223.240000000001,
        "netSCTax": 7656.610000000008
      },
      "shopee": {
        "grossMenu": 26457.75000000001,
        "net": 15289.699999999995,
        "netSC": 15289.699999999995,
        "netSCTax": 16207.340000000007
      },
      "apps": {
        "grossMenu": 16647.4399999999,
        "net": 14298.149999999949,
        "netSC": 14348.14999999995,
        "netSCTax": 16408.399999999976
      },
      "pos": {
        "grossMenu": 84977.4499999995,
        "net": 80262.05999999988,
        "netSC": 85741.56999999945,
        "netSCTax": 90556.56000000014
      }
    },
    "payout": {
      "grab": 21184.45,
      "foodpanda": 5861.96,
      "shopee": 12645.139999999985,
      "apps": 16195.42070593826,
      "pos": 90556.56000000014
    },
    "fees": {
      "grab": {
        "commission": 8249.49000000001,
        "advertising": 6.000000000000001,
        "platformFees": 475.4699999999991,
        "gateway": 0,
        "adjustments": 297.99
      },
      "foodpanda": {
        "commission": 1609.8700000000006,
        "advertising": 0,
        "platformFees": 30,
        "gateway": 0,
        "adjustments": -1117.65
      },
      "shopee": {
        "commission": 3168.329999999992,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 15.9
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 212.97929406171716,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 27393.59999999999,
    "netAfterCommission": 146443.5307059384,
    "commission": -1192.2807059385525,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-015",
    "name": "Mount Austin",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 171386.17999999976,
      "net": 125559.88999999984,
      "netSC": 126122.30999999984,
      "netSCTax": 133834.78000000003
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 70759.75,
        "net": 56785.889999999905,
        "netSC": 56785.889999999905,
        "netSCTax": 60193.88
      },
      "foodpanda": {
        "grossMenu": 24733.00999999996,
        "net": 18619.109999999993,
        "netSC": 18619.109999999993,
        "netSCTax": 19736.250000000015
      },
      "shopee": {
        "grossMenu": 56150.80999999997,
        "net": 35288.9,
        "netSC": 35288.9,
        "netSCTax": 37406.64000000001
      },
      "apps": {
        "grossMenu": 6530.559999999982,
        "net": 5210.579999999995,
        "netSC": 5317.5799999999945,
        "netSCTax": 5808.049999999997
      },
      "pos": {
        "grossMenu": 13212.049999999885,
        "net": 9655.409999999933,
        "netSC": 10110.829999999964,
        "netSCTax": 10689.960000000005
      }
    },
    "payout": {
      "grab": 42532.51000000008,
      "foodpanda": 16275.46999999998,
      "shopee": 29454.319999999985,
      "apps": 5732.662126174691,
      "pos": 10689.960000000005
    },
    "fees": {
      "grab": {
        "commission": 16913.439999999966,
        "advertising": 4197.360000000001,
        "platformFees": 704.9499999999981,
        "gateway": 0,
        "adjustments": 360.85
      },
      "foodpanda": {
        "commission": 4295.330000000001,
        "advertising": 1599.89,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -891.93
      },
      "shopee": {
        "commission": 7493.510000000026,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 220.65999999999997
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 75.38787382530609,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 56859.71000000001,
    "netAfterCommission": 104684.92212617474,
    "commission": 20874.967873825095,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-007",
    "name": "Dang Wangi",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 160970.7200000004,
      "net": 120689.33,
      "netSC": 121718.72000000004,
      "netSCTax": 129040.27999999988
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 65717.37000000007,
        "net": 52826.67,
        "netSC": 52826.67,
        "netSCTax": 55997.41999999987
      },
      "foodpanda": {
        "grossMenu": 29566.589999999986,
        "net": 22073.78000000001,
        "netSC": 22073.78000000001,
        "netSCTax": 23397.68000000001
      },
      "shopee": {
        "grossMenu": 23065.320000000014,
        "net": 14458.510000000004,
        "netSC": 14458.510000000004,
        "netSCTax": 15326.22000000001
      },
      "apps": {
        "grossMenu": 9987.739999999963,
        "net": 8526.399999999972,
        "netSC": 8900.399999999985,
        "netSCTax": 9491.479999999998
      },
      "pos": {
        "grossMenu": 32633.70000000038,
        "net": 22803.970000000012,
        "netSC": 23459.360000000044,
        "netSCTax": 24827.479999999985
      }
    },
    "payout": {
      "grab": 40255.20999999998,
      "foodpanda": 18564.68999999999,
      "shopee": 11528.380000000014,
      "apps": 9368.281594914744,
      "pos": 24827.479999999985
    },
    "fees": {
      "grab": {
        "commission": 15745.25,
        "advertising": 3473.100000000001,
        "platformFees": 589.1599999999984,
        "gateway": 0,
        "adjustments": 947.33
      },
      "foodpanda": {
        "commission": 5271.010000000007,
        "advertising": 1599.9900000000002,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -1093.54
      },
      "shopee": {
        "commission": 2931.8199999999993,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 47.239999999999995
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 123.19840508525522,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 42306.82000000001,
    "netAfterCommission": 104544.04159491471,
    "commission": 16145.288405085288,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-020",
    "name": "Greenlane",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 153251.9999999999,
      "net": 115169.9899999998,
      "netSC": 116164.6699999999,
      "netSCTax": 123417.02999999988
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 74841.21999999994,
        "net": 58994.65999999996,
        "netSC": 58994.65999999996,
        "netSCTax": 62535.05999999983
      },
      "foodpanda": {
        "grossMenu": 14588.350000000008,
        "net": 10395.17,
        "netSC": 10395.17,
        "netSCTax": 11018.829999999998
      },
      "shopee": {
        "grossMenu": 29800.650000000016,
        "net": 18528.91,
        "netSC": 18528.91,
        "netSCTax": 19640.94000000002
      },
      "apps": {
        "grossMenu": 13480.77999999992,
        "net": 11003.34999999995,
        "netSC": 11370.34999999996,
        "netSCTax": 12371.94000000001
      },
      "pos": {
        "grossMenu": 20541.000000000025,
        "net": 16247.899999999883,
        "netSC": 16875.57999999998,
        "netSCTax": 17850.26000000004
      }
    },
    "payout": {
      "grab": 43717.970000000074,
      "foodpanda": 9171.569999999996,
      "shopee": 15454.25000000001,
      "apps": 12211.353529206152,
      "pos": 17850.26000000004
    },
    "fees": {
      "grab": {
        "commission": 17632.70999999999,
        "advertising": 5139.120000000002,
        "platformFees": 980.6299999999964,
        "gateway": 0,
        "adjustments": 278.27
      },
      "foodpanda": {
        "commission": 2464.8000000000006,
        "advertising": 1599.8100000000004,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -592.34
      },
      "shopee": {
        "commission": 3909.86,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 51.18
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 160.58647079385628,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 49912.519999999975,
    "netAfterCommission": 98405.40352920628,
    "commission": 16764.58647079351,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-028",
    "name": "Sri Petaling",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 157202.88000000024,
      "net": 114178.37999999992,
      "netSC": 115461.05999999998,
      "netSCTax": 122553.4899999999
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 58776.96000000001,
        "net": 46239.38999999999,
        "netSC": 46239.38999999999,
        "netSCTax": 49014.01999999997
      },
      "foodpanda": {
        "grossMenu": 21118.769999999964,
        "net": 14515.289999999992,
        "netSC": 14515.289999999992,
        "netSCTax": 15385.689999999984
      },
      "shopee": {
        "grossMenu": 41329.32999999998,
        "net": 25916.729999999992,
        "netSC": 25916.729999999992,
        "netSCTax": 27472.00999999996
      },
      "apps": {
        "grossMenu": 10248.919999999946,
        "net": 7878.239999999979,
        "netSC": 8290.239999999993,
        "netSCTax": 9005.079999999998
      },
      "pos": {
        "grossMenu": 25728.90000000035,
        "net": 19628.72999999998,
        "netSC": 20499.410000000014,
        "netSCTax": 21676.68999999999
      }
    },
    "payout": {
      "grab": 34405.200000000026,
      "foodpanda": 12206.219999999994,
      "shopee": 21412.020000000044,
      "apps": 8888.195015396424,
      "pos": 21676.68999999999
    },
    "fees": {
      "grab": {
        "commission": 13826.59999999998,
        "advertising": 1869.4199999999996,
        "platformFees": 792.9899999999974,
        "gateway": 0,
        "adjustments": 222.89
      },
      "foodpanda": {
        "commission": 3215.5100000000034,
        "advertising": 1599.8100000000004,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": -834.1099999999999
      },
      "shopee": {
        "commission": 5404.110000000009,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 60.94
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 116.88498460357368,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 49135.93999999998,
    "netAfterCommission": 98588.32501539648,
    "commission": 15590.054984603456,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-026",
    "name": "ST Rosyam Mall Klang",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 151752.5400000011,
      "net": 111988.64,
      "netSC": 112129.5,
      "netSCTax": 118911.58999999995
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 53386.139999999934,
        "net": 42185.44,
        "netSC": 42185.44,
        "netSCTax": 44716.76999999998
      },
      "foodpanda": {
        "grossMenu": 13057.589999999982,
        "net": 9358.920000000007,
        "netSC": 9358.920000000007,
        "netSCTax": 9920.220000000005
      },
      "shopee": {
        "grossMenu": 27633.570000000043,
        "net": 17550.190000000017,
        "netSC": 17550.190000000017,
        "netSCTax": 18603.51999999999
      },
      "apps": {
        "grossMenu": 4055.490000000007,
        "net": 2996.770000000005,
        "netSC": 3129.770000000004,
        "netSCTax": 3371.959999999998
      },
      "pos": {
        "grossMenu": 53619.75000000114,
        "net": 39897.319999999985,
        "netSC": 39905.179999999986,
        "netSCTax": 42299.11999999998
      }
    },
    "payout": {
      "grab": 31595.44999999997,
      "foodpanda": 8264.569999999998,
      "shopee": 14619.74000000002,
      "apps": 3328.1923163498955,
      "pos": 42299.11999999998
    },
    "fees": {
      "grab": {
        "commission": 12640.059999999989,
        "advertising": 3098.960000000002,
        "platformFees": 600.6099999999981,
        "gateway": 0,
        "adjustments": 254.19000000000003
      },
      "foodpanda": {
        "commission": 2220.87,
        "advertising": 1099.6699999999998,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": -430.77
      },
      "shopee": {
        "commission": 3654.9900000000016,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 122.09
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 43.767683650102754,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 44999.56000000002,
    "netAfterCommission": 100107.07231634986,
    "commission": 11881.567683650152,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-037",
    "name": "Lotus Seberang Jaya",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 117663.60000000196,
      "net": 95864.7300000012,
      "netSC": 98430.90000000029,
      "netSCTax": 104666.17000000026
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 14166.430000000006,
        "net": 11101.710000000005,
        "netSC": 11101.710000000005,
        "netSCTax": 11768.219999999998
      },
      "foodpanda": {
        "grossMenu": 13071.409999999987,
        "net": 9515.01,
        "netSC": 9515.01,
        "netSCTax": 10085.879999999996
      },
      "shopee": {
        "grossMenu": 19850.11000000001,
        "net": 12239.279999999988,
        "netSC": 12239.279999999988,
        "netSCTax": 12973.909999999983
      },
      "apps": {
        "grossMenu": 11501.049999999952,
        "net": 9517.309999999969,
        "netSC": 9618.30999999997,
        "netSCTax": 10672.88
      },
      "pos": {
        "grossMenu": 59074.600000001985,
        "net": 53491.42000000124,
        "netSC": 55956.59000000031,
        "netSCTax": 59165.28000000028
      }
    },
    "payout": {
      "grab": 8296.999999999995,
      "foodpanda": 8369.649999999998,
      "shopee": 10313.020000000011,
      "apps": 10534.347148045792,
      "pos": 59165.28000000028
    },
    "fees": {
      "grab": {
        "commission": 3257.169999999996,
        "advertising": 1101.91,
        "platformFees": 170.14999999999998,
        "gateway": 0,
        "adjustments": 106.8
      },
      "foodpanda": {
        "commission": 2133.4000000000015,
        "advertising": 799.7999999999998,
        "platformFees": 30,
        "gateway": 0,
        "adjustments": -663.47
      },
      "shopee": {
        "commission": 2586.590000000002,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 76.94
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 138.53285195420722,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 35034.009999999995,
    "netAfterCommission": 96679.29714804608,
    "commission": -814.56714804488,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-021",
    "name": "Summerton",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 125024.40999999989,
      "net": 93857.41999999972,
      "netSC": 94670.6499999998,
      "netSCTax": 100820.40999999996
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 47674.31000000014,
        "net": 37814.3599999999,
        "netSC": 37814.3599999999,
        "netSCTax": 40083.87999999993
      },
      "foodpanda": {
        "grossMenu": 15626.119999999995,
        "net": 10345.730000000003,
        "netSC": 10345.730000000003,
        "netSCTax": 10966.209999999995
      },
      "shopee": {
        "grossMenu": 33484.329999999994,
        "net": 21150.889999999992,
        "netSC": 21150.889999999992,
        "netSCTax": 22420.409999999974
      },
      "apps": {
        "grossMenu": 13729.349999999904,
        "net": 11243.119999999946,
        "netSC": 11400.119999999955,
        "netSCTax": 12592.320000000009
      },
      "pos": {
        "grossMenu": 14510.299999999852,
        "net": 13303.319999999878,
        "netSC": 13959.549999999954,
        "netSCTax": 14757.590000000024
      }
    },
    "payout": {
      "grab": 28261.119999999984,
      "foodpanda": 9174.749999999996,
      "shopee": 17814.39000000004,
      "apps": 12428.873020148272,
      "pos": 14757.590000000024
    },
    "fees": {
      "grab": {
        "commission": 11251.399999999989,
        "advertising": 3515.5200000000004,
        "platformFees": 620.469999999998,
        "gateway": 0,
        "adjustments": 32.77000000000001
      },
      "foodpanda": {
        "commission": 2390.6,
        "advertising": 1599.6100000000004,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -777.13
      },
      "shopee": {
        "commission": 4506.310000000003,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 32.04
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 163.4469798517366,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 47183.819999999985,
    "netAfterCommission": 82436.72302014832,
    "commission": 11420.696979851404,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-078",
    "name": "Lucerne Residence Penang",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 123324.33000000085,
      "net": 93489.20000000038,
      "netSC": 95258.70000000016,
      "netSCTax": 101352.03000000004
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 26483.229999999945,
        "net": 20935.60000000003,
        "netSC": 20935.60000000003,
        "netSCTax": 22191.820000000032
      },
      "foodpanda": {
        "grossMenu": 14188.000000000007,
        "net": 9719.75999999999,
        "netSC": 9719.75999999999,
        "netSCTax": 10302.659999999987
      },
      "shopee": {
        "grossMenu": 28712.820000000007,
        "net": 18009.719999999983,
        "netSC": 18009.719999999983,
        "netSCTax": 19090.66999999996
      },
      "apps": {
        "grossMenu": 17011.879999999896,
        "net": 13152.579999999927,
        "netSC": 13458.57999999993,
        "netSCTax": 14732.14
      },
      "pos": {
        "grossMenu": 36928.40000000099,
        "net": 31671.540000000445,
        "netSC": 33135.04000000023,
        "netSCTax": 35034.74000000006
      }
    },
    "payout": {
      "grab": 15774.580000000007,
      "foodpanda": 8190.499999999998,
      "shopee": 14445.180000000004,
      "apps": 14540.918383192857,
      "pos": 35034.74000000006
    },
    "fees": {
      "grab": {
        "commission": 6073.270000000004,
        "advertising": 7.489999999999999,
        "platformFees": 365.7399999999993,
        "gateway": 0,
        "adjustments": 183.87
      },
      "foodpanda": {
        "commission": 2155.420000000002,
        "advertising": 300,
        "platformFees": 72,
        "gateway": 0,
        "adjustments": -602.5
      },
      "shopee": {
        "commission": 3625.019999999999,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 40.63
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 191.22161680714635,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 43489.94999999998,
    "netAfterCommission": 87985.91838319293,
    "commission": 5503.28161680745,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-013",
    "name": "Senawang",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 117922.38999999996,
      "net": 91493.22999999986,
      "netSC": 91911.37999999987,
      "netSCTax": 97211.09999999996
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 38010.63000000002,
        "net": 30342.839999999935,
        "netSC": 30342.839999999935,
        "netSCTax": 32163.920000000016
      },
      "foodpanda": {
        "grossMenu": 23853.009999999977,
        "net": 18978.039999999994,
        "netSC": 18978.039999999994,
        "netSCTax": 20116.40999999998
      },
      "shopee": {
        "grossMenu": 34688.60000000007,
        "net": 22931.060000000027,
        "netSC": 22931.060000000027,
        "netSCTax": 24307.09999999996
      },
      "apps": {
        "grossMenu": 11591.149999999929,
        "net": 9863.52999999995,
        "netSC": 10039.52999999996,
        "netSCTax": 10441.119999999974
      },
      "pos": {
        "grossMenu": 9778.999999999947,
        "net": 9377.75999999995,
        "netSC": 9619.909999999963,
        "netSCTax": 10182.550000000016
      }
    },
    "payout": {
      "grab": 22706.150000000005,
      "foodpanda": 16421.88,
      "shopee": 19388.73000000005,
      "apps": 10305.595368298304,
      "pos": 10182.550000000016
    },
    "fees": {
      "grab": {
        "commission": 9075.34999999999,
        "advertising": 2223.630000000001,
        "platformFees": 371.7999999999991,
        "gateway": 0,
        "adjustments": 197.63
      },
      "foodpanda": {
        "commission": 4264.720000000001,
        "advertising": 2099.78,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -767.52
      },
      "shopee": {
        "commission": 4911.00000000001,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 135.52463170166993,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 33362.83999999998,
    "netAfterCommission": 79004.90536829838,
    "commission": 12488.324631701484,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-009",
    "name": "Kota Warisan",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 116684.86999999976,
      "net": 90867.56999999985,
      "netSC": 91687.0699999999,
      "netSCTax": 97503.99000000003
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 47346.86999999999,
        "net": 37519.29000000003,
        "netSC": 37519.29000000003,
        "netSCTax": 39770.690000000024
      },
      "foodpanda": {
        "grossMenu": 29229.939999999988,
        "net": 21400.829999999984,
        "netSC": 21400.829999999984,
        "netSCTax": 22684.699999999993
      },
      "shopee": {
        "grossMenu": 12044.02,
        "net": 7753.260000000001,
        "netSC": 7753.260000000001,
        "netSCTax": 8218.369999999988
      },
      "apps": {
        "grossMenu": 11984.039999999934,
        "net": 9708.239999999963,
        "netSC": 9921.239999999972,
        "netSCTax": 10868.970000000014
      },
      "pos": {
        "grossMenu": 16079.999999999844,
        "net": 14485.94999999987,
        "netSC": 15092.44999999993,
        "netSCTax": 15961.260000000018
      }
    },
    "payout": {
      "grab": 27828.429999999964,
      "foodpanda": 18597.529999999995,
      "shopee": 6187.84,
      "apps": 10727.891920615188,
      "pos": 15961.260000000018
    },
    "fees": {
      "grab": {
        "commission": 11045.259999999998,
        "advertising": 3114.3500000000017,
        "platformFees": 488.2599999999985,
        "gateway": 0,
        "adjustments": 307.71999999999997
      },
      "foodpanda": {
        "commission": 4981.8099999999995,
        "advertising": 2099.8900000000003,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -985.31
      },
      "shopee": {
        "commission": 1486.5100000000004,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 134.15
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 141.0780793848262,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 38704.85999999999,
    "netAfterCommission": 79302.95192061517,
    "commission": 11564.618079384658,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-008",
    "name": "Pandan Indah",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 125089.95999999982,
      "net": 90831.41999999988,
      "netSC": 91774.80999999992,
      "netSCTax": 97364.17999999998
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 35855.01999999998,
        "net": 28507.93999999996,
        "netSC": 28507.93999999996,
        "netSCTax": 30218.729999999956
      },
      "foodpanda": {
        "grossMenu": 18326.46,
        "net": 13550.509999999982,
        "netSC": 13550.509999999982,
        "netSCTax": 14363.229999999996
      },
      "shopee": {
        "grossMenu": 45087.38000000001,
        "net": 28195.01000000004,
        "netSC": 28195.01000000004,
        "netSCTax": 29886.89000000001
      },
      "apps": {
        "grossMenu": 8736.399999999969,
        "net": 6982.919999999989,
        "netSC": 7281.91999999999,
        "netSCTax": 7840.239999999995
      },
      "pos": {
        "grossMenu": 17084.699999999866,
        "net": 13595.039999999904,
        "netSC": 14239.42999999996,
        "netSCTax": 15055.090000000026
      }
    },
    "payout": {
      "grab": 20561.829999999973,
      "foodpanda": 9677.83,
      "shopee": 21193.770000000055,
      "apps": 7738.474515219368,
      "pos": 15055.090000000026
    },
    "fees": {
      "grab": {
        "commission": 8203.240000000002,
        "advertising": 2145.7400000000007,
        "platformFees": 423.5799999999989,
        "gateway": 0,
        "adjustments": 141.31
      },
      "foodpanda": {
        "commission": 2544.5400000000013,
        "advertising": 1799.5000000000002,
        "platformFees": 435.5,
        "gateway": 0,
        "adjustments": -542.11
      },
      "shopee": {
        "commission": 5367.950000000009,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 120.68999999999998
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 101.76548478062703,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 37990.399999999994,
    "netAfterCommission": 74226.99451521943,
    "commission": 16604.42548478044,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-036",
    "name": "Puchong Jaya",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 119481.78000000032,
      "net": 89212.57999999987,
      "netSC": 90419.79999999992,
      "netSCTax": 96051.00999999998
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 46051.54000000002,
        "net": 36552.72999999995,
        "netSC": 36552.72999999995,
        "netSCTax": 38746.30999999997
      },
      "foodpanda": {
        "grossMenu": 16247.37,
        "net": 10566.780000000002,
        "netSC": 10566.780000000002,
        "netSCTax": 11200.420000000002
      },
      "shopee": {
        "grossMenu": 20453.71999999999,
        "net": 13093.619999999972,
        "netSC": 13093.619999999972,
        "netSCTax": 13879.190000000004
      },
      "apps": {
        "grossMenu": 10063.54999999994,
        "net": 8111.149999999967,
        "netSC": 8299.149999999978,
        "netSCTax": 9064.730000000009
      },
      "pos": {
        "grossMenu": 26665.60000000037,
        "net": 20888.299999999977,
        "netSC": 21907.520000000015,
        "netSCTax": 23160.360000000004
      }
    },
    "payout": {
      "grab": 27236.43,
      "foodpanda": 8781.309999999996,
      "shopee": 10944.800000000016,
      "apps": 8947.070764714419,
      "pos": 23160.360000000004
    },
    "fees": {
      "grab": {
        "commission": 10743.849999999997,
        "advertising": 2966.9,
        "platformFees": 553.8599999999982,
        "gateway": 0,
        "adjustments": 424.73
      },
      "foodpanda": {
        "commission": 2354.050000000002,
        "advertising": 1000,
        "platformFees": 30,
        "gateway": 0,
        "adjustments": -661.91
      },
      "shopee": {
        "commission": 2758.3099999999995,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 253.85
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 117.6592352855896,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 31493.909999999996,
    "netAfterCommission": 79069.97076471444,
    "commission": 10142.609235285432,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-002",
    "name": "Ampang",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 111777.68999999978,
      "net": 85790.01999999993,
      "netSC": 86148.07999999993,
      "netSCTax": 91339.67999999992
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 60961.14999999987,
        "net": 49136.979999999945,
        "netSC": 49136.979999999945,
        "netSCTax": 52086.399999999914
      },
      "foodpanda": {
        "grossMenu": 18846.56,
        "net": 14038.56000000001,
        "netSC": 14038.56000000001,
        "netSCTax": 14880.850000000008
      },
      "shopee": {
        "grossMenu": 15919.799999999985,
        "net": 10221.55000000001,
        "netSC": 10221.55000000001,
        "netSCTax": 10834.680000000004
      },
      "apps": {
        "grossMenu": 3706.380000000005,
        "net": 2938.570000000002,
        "netSC": 3066.569999999999,
        "netSCTax": 3286.2099999999987
      },
      "pos": {
        "grossMenu": 12343.799999999916,
        "net": 9454.359999999951,
        "netSC": 9684.419999999966,
        "netSCTax": 10251.54
      }
    },
    "payout": {
      "grab": 37068.939999999966,
      "foodpanda": 11461.84,
      "shopee": 8416.530000000008,
      "apps": 3243.555342267462,
      "pos": 10251.54
    },
    "fees": {
      "grab": {
        "commission": 14582.549999999996,
        "advertising": 4044.2399999999993,
        "platformFees": 573.8699999999982,
        "gateway": 0,
        "adjustments": 595.7200000000001
      },
      "foodpanda": {
        "commission": 2968.059999999999,
        "advertising": 1599.9599999999998,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -698.97
      },
      "shopee": {
        "commission": 2133.459999999997,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 86.04
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 42.654657732536634,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 31965.269999999997,
    "netAfterCommission": 70442.40534226743,
    "commission": 15347.614657732498,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-005",
    "name": "SS2",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 113238.95,
      "net": 83336.60999999994,
      "netSC": 84215.29,
      "netSCTax": 89341.56999999989
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 49803.91,
        "net": 39183.440000000046,
        "netSC": 39183.440000000046,
        "netSCTax": 41534.63999999988
      },
      "foodpanda": {
        "grossMenu": 11081.389999999996,
        "net": 7935.299999999998,
        "netSC": 7935.299999999998,
        "netSCTax": 8411.240000000002
      },
      "shopee": {
        "grossMenu": 27871.070000000014,
        "net": 16996.75,
        "netSC": 16996.75,
        "netSCTax": 18016.51
      },
      "apps": {
        "grossMenu": 5387.079999999997,
        "net": 4320.680000000009,
        "netSC": 4460.680000000003,
        "netSCTax": 4846.269999999994
      },
      "pos": {
        "grossMenu": 19095.499999999996,
        "net": 14900.43999999989,
        "netSC": 15639.11999999995,
        "netSCTax": 16532.91000000002
      }
    },
    "payout": {
      "grab": 29314.669999999973,
      "foodpanda": 5386.960000000004,
      "shopee": 13990.130000000016,
      "apps": 4783.365928705262,
      "pos": 16532.91000000002
    },
    "fees": {
      "grab": {
        "commission": 11628.709999999995,
        "advertising": 3537.810000000001,
        "platformFees": 627.1999999999977,
        "gateway": 0,
        "adjustments": 487.86999999999995
      },
      "foodpanda": {
        "commission": 1445.829999999999,
        "advertising": 1299.2300000000002,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -476.37
      },
      "shopee": {
        "commission": 3551.9599999999973,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 113.54
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 62.90407129473169,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 33739.21,
    "netAfterCommission": 70008.03592870529,
    "commission": 13328.574071294655,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-003",
    "name": "Seri Kembangan",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 110164.34000000004,
      "net": 82138.44999999987,
      "netSC": 83103.48999999993,
      "netSCTax": 88201.66000000008
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 49091.420000000064,
        "net": 38758.900000000016,
        "netSC": 38758.900000000016,
        "netSCTax": 41085.61000000005
      },
      "foodpanda": {
        "grossMenu": 14737.959999999995,
        "net": 10426.979999999992,
        "netSC": 10426.979999999992,
        "netSCTax": 11052.459999999995
      },
      "shopee": {
        "grossMenu": 19270.59999999996,
        "net": 12211.000000000002,
        "netSC": 12211.000000000002,
        "netSCTax": 12943.529999999995
      },
      "apps": {
        "grossMenu": 7191.059999999977,
        "net": 5481.859999999996,
        "netSC": 5739.859999999993,
        "netSCTax": 6237.909999999997
      },
      "pos": {
        "grossMenu": 19873.300000000032,
        "net": 15259.70999999986,
        "netSC": 15966.749999999936,
        "netSCTax": 16882.150000000038
      }
    },
    "payout": {
      "grab": 29327.64999999995,
      "foodpanda": 9136.029999999992,
      "shopee": 10168.030000000012,
      "apps": 6156.942588904429,
      "pos": 16882.150000000038
    },
    "fees": {
      "grab": {
        "commission": 11674.53000000002,
        "advertising": 3448.899999999999,
        "platformFees": 558.9599999999984,
        "gateway": 0,
        "adjustments": 442.57
      },
      "foodpanda": {
        "commission": 2383.9599999999996,
        "advertising": 1099.98,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -551.72
      },
      "shopee": {
        "commission": 2557.3499999999967,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 139.94
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 80.96741109556842,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 29579.35,
    "netAfterCommission": 71670.80258890442,
    "commission": 10467.647411095444,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-004",
    "name": "SS15",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 108609.6699999999,
      "net": 81338.27999999982,
      "netSC": 81854.44999999987,
      "netSCTax": 86955.26999999996
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 51995.23000000003,
        "net": 40700.53999999999,
        "netSC": 40700.53999999999,
        "netSCTax": 43143.019999999946
      },
      "foodpanda": {
        "grossMenu": 13789.30999999999,
        "net": 9254.579999999996,
        "netSC": 9254.579999999996,
        "netSCTax": 9809.650000000003
      },
      "shopee": {
        "grossMenu": 17568.929999999993,
        "net": 10824.35,
        "netSC": 10824.35,
        "netSCTax": 11473.890000000009
      },
      "apps": {
        "grossMenu": 7285.759999999979,
        "net": 5932.039999999989,
        "netSC": 6056.03999999999,
        "netSCTax": 6632.449999999997
      },
      "pos": {
        "grossMenu": 17970.439999999908,
        "net": 14626.76999999984,
        "netSC": 15018.939999999886,
        "netSCTax": 15896.260000000017
      }
    },
    "payout": {
      "grab": 29772.009999999995,
      "foodpanda": 7320.65,
      "shopee": 8553.280000000008,
      "apps": 6546.3615014931565,
      "pos": 15896.260000000017
    },
    "fees": {
      "grab": {
        "commission": 11873.119999999995,
        "advertising": 3961.7000000000007,
        "platformFees": 765.659999999997,
        "gateway": 0,
        "adjustments": 141.82
      },
      "foodpanda": {
        "commission": 1922.639999999999,
        "advertising": 1099.32,
        "platformFees": 124,
        "gateway": 0,
        "adjustments": -704.9300000000001
      },
      "shopee": {
        "commission": 2130.6399999999994,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 100.69
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 86.08849850684055,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 38302.130000000005,
    "netAfterCommission": 68088.56150149318,
    "commission": 13249.71849850664,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-017",
    "name": "Taman Universiti",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 112111.06999999996,
      "net": 80658.88999999998,
      "netSC": 80751.42999999998,
      "netSCTax": 85754.95999999998
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 41183.57000000001,
        "net": 32418.419999999995,
        "netSC": 32418.419999999995,
        "netSCTax": 34364.040000000015
      },
      "foodpanda": {
        "grossMenu": 18719.470000000005,
        "net": 13042.609999999995,
        "netSC": 13042.609999999995,
        "netSCTax": 13825.069999999976
      },
      "shopee": {
        "grossMenu": 41173.79999999997,
        "net": 26000.71999999999,
        "netSC": 26000.71999999999,
        "netSCTax": 27561.049999999977
      },
      "apps": {
        "grossMenu": 6957.229999999973,
        "net": 5295.289999999987,
        "netSC": 5295.289999999987,
        "netSCTax": 5776.359999999998
      },
      "pos": {
        "grossMenu": 4077.0000000000105,
        "net": 3901.8500000000095,
        "netSC": 3994.390000000006,
        "netSCTax": 4228.439999999996
      }
    },
    "payout": {
      "grab": 24846.989999999987,
      "foodpanda": 11402.780000000002,
      "shopee": 21943.000000000025,
      "apps": 5701.383459018163,
      "pos": 4228.439999999996
    },
    "fees": {
      "grab": {
        "commission": 9695.709999999988,
        "advertising": 2484.230000000001,
        "platformFees": 441.639999999999,
        "gateway": 0,
        "adjustments": 807.13
      },
      "foodpanda": {
        "commission": 3050.589999999999,
        "advertising": 1599.9699999999998,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -851.23
      },
      "shopee": {
        "commission": 5532.770000000014,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 102.14
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 74.97654098183466,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 34894.55999999999,
    "netAfterCommission": 68122.59345901817,
    "commission": 12536.296540981812,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-040",
    "name": "Kiara Bay",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 112200.10000000097,
      "net": 80486.94000000019,
      "netSC": 82092.89000000017,
      "netSCTax": 87160.20999999985
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 26004.39000000002,
        "net": 20250.92000000003,
        "netSC": 20250.92000000003,
        "netSCTax": 21466.349999999944
      },
      "foodpanda": {
        "grossMenu": 9974.4,
        "net": 6811.46,
        "netSC": 6811.46,
        "netSCTax": 7220.030000000003
      },
      "shopee": {
        "grossMenu": 28838.96000000005,
        "net": 18286.470000000016,
        "netSC": 18286.470000000016,
        "netSCTax": 19383.82999999999
      },
      "apps": {
        "grossMenu": 8697.899999999961,
        "net": 6805.139999999984,
        "netSC": 6966.1399999999885,
        "netSCTax": 7612.1899999999905
      },
      "pos": {
        "grossMenu": 38684.45000000093,
        "net": 28332.95000000016,
        "netSC": 29777.900000000136,
        "netSCTax": 31477.80999999993
      }
    },
    "payout": {
      "grab": 15120.15000000002,
      "foodpanda": 5740.009999999998,
      "shopee": 15044.930000000004,
      "apps": 7513.384580064856,
      "pos": 31477.80999999993
    },
    "fees": {
      "grab": {
        "commission": 6052.580000000001,
        "advertising": 1750.09,
        "platformFees": 332.0999999999995,
        "gateway": 0,
        "adjustments": 58.56
      },
      "foodpanda": {
        "commission": 1553.739999999999,
        "advertising": 599.8500000000001,
        "platformFees": 30,
        "gateway": 0,
        "adjustments": -440.1
      },
      "shopee": {
        "commission": 3757.069999999999,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 205.39
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 98.80541993513452,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 28607.53,
    "netAfterCommission": 74896.2845800648,
    "commission": 5590.655419935385,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-027",
    "name": "Sungai Petani",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 97786.36999999984,
      "net": 77942.19999999991,
      "netSC": 78705.22999999998,
      "netSCTax": 83652.35000000006
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 27308.730000000032,
        "net": 21953.00000000004,
        "netSC": 21953.00000000004,
        "netSCTax": 23270.730000000047
      },
      "foodpanda": {
        "grossMenu": 20333.15000000001,
        "net": 15584.790000000012,
        "netSC": 15584.790000000012,
        "netSCTax": 16519.909999999993
      },
      "shopee": {
        "grossMenu": 23403.609999999993,
        "net": 15933.930000000004,
        "netSC": 15933.930000000004,
        "netSCTax": 16890.25999999998
      },
      "apps": {
        "grossMenu": 10051.32999999996,
        "net": 8136.899999999978,
        "netSC": 8243.899999999981,
        "netSCTax": 9001.920000000007
      },
      "pos": {
        "grossMenu": 16689.54999999986,
        "net": 16333.579999999864,
        "netSC": 16989.609999999942,
        "netSCTax": 17969.530000000024
      }
    },
    "payout": {
      "grab": 16210.48,
      "foodpanda": 13356.190000000006,
      "shopee": 13272.010000000037,
      "apps": 8885.076031861734,
      "pos": 17969.530000000024
    },
    "fees": {
      "grab": {
        "commission": 6524.850000000003,
        "advertising": 1648.36,
        "platformFees": 298.87999999999965,
        "gateway": 0,
        "adjustments": -23.9
      },
      "foodpanda": {
        "commission": 3643.24,
        "advertising": 1599.9700000000005,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -798.84
      },
      "shopee": {
        "commission": 3334.229999999993,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 75.25
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 116.84396813827334,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 29583.640000000003,
    "netAfterCommission": 69693.28603186179,
    "commission": 8248.91396813812,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "SB-020",
    "name": "Bundusan",
    "entity": "MY US PIZZA (SABAH) SDN BHD",
    "metrics": {
      "grossMenu": 104070.81,
      "net": 77338.85999999993,
      "netSC": 77662.01999999993,
      "netSCTax": 80196.45999999999
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 44077.110000000066,
        "net": 35032.969999999965,
        "netSC": 35032.969999999965,
        "netSCTax": 37131.39000000003
      },
      "foodpanda": {
        "grossMenu": 22577.899999999976,
        "net": 15503.179999999997,
        "netSC": 15503.179999999997,
        "netSCTax": 15503.179999999997
      },
      "shopee": {
        "grossMenu": 26145.169999999987,
        "net": 16147.469999999985,
        "netSC": 16147.469999999985,
        "netSCTax": 16147.469999999985
      },
      "apps": {
        "grossMenu": 4119.680000000008,
        "net": 3547.6400000000067,
        "netSC": 3575.6400000000062,
        "netSCTax": 4011.6599999999953
      },
      "pos": {
        "grossMenu": 7150.949999999974,
        "net": 7107.599999999975,
        "netSC": 7402.75999999998,
        "netSCTax": 7402.75999999998
      }
    },
    "payout": {
      "grab": 26190.81999999997,
      "foodpanda": 12192.47000000002,
      "shopee": 12350.8,
      "apps": 3959.5890781053786,
      "pos": 7402.75999999998
    },
    "fees": {
      "grab": {
        "commission": 10563.34,
        "advertising": 3158.36,
        "platformFees": 510.88999999999845,
        "gateway": 0,
        "adjustments": 163.28000000000003
      },
      "foodpanda": {
        "commission": 3478.4099999999985,
        "advertising": 1599.9199999999998,
        "platformFees": 81.75,
        "gateway": 0,
        "adjustments": -1385.52
      },
      "shopee": {
        "commission": 3379.1999999999994,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 52.07092189461673,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 20067.188,
    "netAfterCommission": 62096.43907810535,
    "commission": 15242.420921894576,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-012",
    "name": "Seremban",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 98434.58999999994,
      "net": 76710.45999999985,
      "netSC": 77369.3999999999,
      "netSCTax": 82237.48000000003
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 37836.15000000004,
        "net": 30174.139999999963,
        "netSC": 30174.139999999963,
        "netSCTax": 31985.180000000037
      },
      "foodpanda": {
        "grossMenu": 17807.850000000013,
        "net": 13661.699999999992,
        "netSC": 13661.699999999992,
        "netSCTax": 14481.15999999999
      },
      "shopee": {
        "grossMenu": 21420.46000000003,
        "net": 14109.520000000004,
        "netSC": 14109.520000000004,
        "netSCTax": 14956.319999999989
      },
      "apps": {
        "grossMenu": 9276.829999999958,
        "net": 7152.869999999979,
        "netSC": 7329.86999999998,
        "netSCTax": 8024.019999999999
      },
      "pos": {
        "grossMenu": 12093.299999999905,
        "net": 11612.229999999909,
        "netSC": 12094.16999999997,
        "netSCTax": 12790.800000000005
      }
    },
    "payout": {
      "grab": 22864.479999999978,
      "foodpanda": 11905.55,
      "shopee": 11915.890000000014,
      "apps": 7919.869070284907,
      "pos": 12790.800000000005
    },
    "fees": {
      "grab": {
        "commission": 9175.970000000005,
        "advertising": 2556.1400000000012,
        "platformFees": 433.039999999999,
        "gateway": 0,
        "adjustments": 57.43999999999999
      },
      "foodpanda": {
        "commission": 3066.0800000000004,
        "advertising": 1599.2599999999993,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -332.82000000000005
      },
      "shopee": {
        "commission": 3025.419999999996,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 104.15092971509148,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 29114.349999999995,
    "netAfterCommission": 67396.5890702849,
    "commission": 9313.870929714947,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-023",
    "name": "Bukit Mertajam",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 99367.05999999988,
      "net": 74204.39999999997,
      "netSC": 74556.52999999997,
      "netSCTax": 79484.96999999999
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 35477.66000000004,
        "net": 27876.79000000003,
        "netSC": 27876.79000000003,
        "netSCTax": 29549.869999999977
      },
      "foodpanda": {
        "grossMenu": 21048.259999999977,
        "net": 14961.660000000007,
        "netSC": 14961.660000000007,
        "netSCTax": 15859.059999999989
      },
      "shopee": {
        "grossMenu": 21467.049999999996,
        "net": 13496.219999999996,
        "netSC": 13496.219999999996,
        "netSCTax": 14306.360000000006
      },
      "apps": {
        "grossMenu": 13995.749999999904,
        "net": 11469.509999999944,
        "netSC": 11578.509999999938,
        "netSCTax": 12742.490000000009
      },
      "pos": {
        "grossMenu": 7378.339999999967,
        "net": 6400.219999999986,
        "netSC": 6643.349999999989,
        "netSCTax": 7027.190000000001
      }
    },
    "payout": {
      "grab": 20777.13999999999,
      "foodpanda": 13146.399999999989,
      "shopee": 11277.750000000013,
      "apps": 12577.093829453916,
      "pos": 7027.190000000001
    },
    "fees": {
      "grab": {
        "commission": 8311.009999999995,
        "advertising": 2756.26,
        "platformFees": 446.1899999999989,
        "gateway": 0,
        "adjustments": 303.96000000000004
      },
      "foodpanda": {
        "commission": 3376.8500000000013,
        "advertising": 1799.73,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -739.5
      },
      "shopee": {
        "commission": 2857.650000000003,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 105.31
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 165.39617054609153,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 28048.64999999999,
    "netAfterCommission": 64805.57382945391,
    "commission": 9398.826170546054,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-032",
    "name": "Citta Mall",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 98998.20000000032,
      "net": 73971.31999999998,
      "netSC": 74096.31999999998,
      "netSCTax": 78577.31999999993
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 42455.10000000004,
        "net": 33274.19000000002,
        "netSC": 33274.19000000002,
        "netSCTax": 35271.04999999995
      },
      "foodpanda": {
        "grossMenu": 9134.240000000003,
        "net": 5775.069999999998,
        "netSC": 5775.069999999998,
        "netSCTax": 6121.349999999998
      },
      "shopee": {
        "grossMenu": 15098.720000000016,
        "net": 9416.759999999998,
        "netSC": 9416.759999999998,
        "netSCTax": 9981.879999999996
      },
      "apps": {
        "grossMenu": 5166.8899999999985,
        "net": 3895.890000000006,
        "netSC": 4020.890000000003,
        "netSCTax": 4297.749999999998
      },
      "pos": {
        "grossMenu": 27143.250000000266,
        "net": 21609.40999999996,
        "netSC": 21609.40999999996,
        "netSCTax": 22905.289999999983
      }
    },
    "payout": {
      "grab": 25191.609999999975,
      "foodpanda": 4970.3200000000015,
      "shopee": 7948.209999999997,
      "apps": 4241.965660207346,
      "pos": 22905.289999999983
    },
    "fees": {
      "grab": {
        "commission": 9938.500000000013,
        "advertising": 2979.1,
        "platformFees": 596.0999999999982,
        "gateway": 0,
        "adjustments": 71.38000000000002
      },
      "foodpanda": {
        "commission": 1295.0500000000009,
        "advertising": 799.8799999999999,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": -323.11
      },
      "shopee": {
        "commission": 1971.3399999999956,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 89.16000000000001
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 55.784339792651735,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 28848.51000000001,
    "netAfterCommission": 65257.39566020731,
    "commission": 8713.92433979267,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-010",
    "name": "Ayer Keroh",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 99138.89000000006,
      "net": 73377.45999999992,
      "netSC": 73744.04999999994,
      "netSCTax": 78169.43000000001
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 43356.58000000009,
        "net": 34338.909999999974,
        "netSC": 34338.909999999974,
        "netSCTax": 36399.85000000003
      },
      "foodpanda": {
        "grossMenu": 14704.410000000007,
        "net": 10737.829999999998,
        "netSC": 10737.829999999998,
        "netSCTax": 11381.76999999998
      },
      "shopee": {
        "grossMenu": 26235.91000000002,
        "net": 16016.280000000006,
        "netSC": 16016.280000000006,
        "netSCTax": 16977.689999999995
      },
      "apps": {
        "grossMenu": 2866.790000000002,
        "net": 2002.1800000000017,
        "netSC": 2054.1800000000007,
        "netSCTax": 2196.349999999998
      },
      "pos": {
        "grossMenu": 11975.19999999992,
        "net": 10282.259999999938,
        "netSC": 10596.849999999964,
        "netSCTax": 11213.770000000002
      }
    },
    "payout": {
      "grab": 25611.80999999994,
      "foodpanda": 9574.639999999989,
      "shopee": 13540.160000000024,
      "apps": 2167.8416096321102,
      "pos": 11213.770000000002
    },
    "fees": {
      "grab": {
        "commission": 10247.289999999992,
        "advertising": 2534.4100000000003,
        "platformFees": 462.3399999999989,
        "gateway": 0,
        "adjustments": 143.31
      },
      "foodpanda": {
        "commission": 2533.9399999999987,
        "advertising": 1599.7700000000002,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -639.26
      },
      "shopee": {
        "commission": 3433.5399999999963,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 30.96
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 28.50839036788784,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 27821.44999999999,
    "netAfterCommission": 62108.22160963206,
    "commission": 11269.238390367856,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-031",
    "name": "SB Mall",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 97352.14000000022,
      "net": 71163.93999999994,
      "netSC": 71259.93999999994,
      "netSCTax": 75619.31999999993
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 28862.660000000014,
        "net": 23352.99999999998,
        "netSC": 23352.99999999998,
        "netSCTax": 24754.479999999978
      },
      "foodpanda": {
        "grossMenu": 10669.659999999996,
        "net": 7404.8399999999965,
        "netSC": 7404.8399999999965,
        "netSCTax": 7849.16
      },
      "shopee": {
        "grossMenu": 28095.560000000056,
        "net": 18150.01000000001,
        "netSC": 18150.01000000001,
        "netSCTax": 19239.309999999976
      },
      "apps": {
        "grossMenu": 4144.060000000007,
        "net": 3276.710000000003,
        "netSC": 3372.710000000002,
        "netSCTax": 3658.149999999999
      },
      "pos": {
        "grossMenu": 25580.200000000135,
        "net": 18979.37999999996,
        "netSC": 18979.37999999996,
        "netSCTax": 20118.219999999983
      }
    },
    "payout": {
      "grab": 17441.62999999999,
      "foodpanda": 6375.3600000000015,
      "shopee": 15073.750000000016,
      "apps": 3610.6676004624537,
      "pos": 20118.219999999983
    },
    "fees": {
      "grab": {
        "commission": 6917.199999999999,
        "advertising": 1838.8799999999997,
        "platformFees": 317.85999999999945,
        "gateway": 0,
        "adjustments": 241.26999999999995
      },
      "foodpanda": {
        "commission": 1648.2599999999995,
        "advertising": 1099.7099999999998,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": -271.54
      },
      "shopee": {
        "commission": 3793.969999999996,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 195.57
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 47.48239953754592,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 30821.370000000006,
    "netAfterCommission": 62619.62760046244,
    "commission": 8544.312399537506,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-035",
    "name": "Kamunting Taiping",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 96352.28000000004,
      "net": 69814.65999999989,
      "netSC": 70211.3199999999,
      "netSCTax": 74441.15000000005
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 13715.240000000002,
        "net": 10947.390000000009,
        "netSC": 10947.390000000009,
        "netSCTax": 11604.369999999994
      },
      "foodpanda": {
        "grossMenu": 23753.59999999996,
        "net": 17405.949999999975,
        "netSC": 17405.949999999975,
        "netSCTax": 18449.780000000013
      },
      "shopee": {
        "grossMenu": 34459.18000000002,
        "net": 22183.66000000002,
        "netSC": 22183.66000000002,
        "netSCTax": 23515.490000000016
      },
      "apps": {
        "grossMenu": 4285.160000000005,
        "net": 3213.5400000000063,
        "netSC": 3296.540000000005,
        "netSCTax": 3529.969999999996
      },
      "pos": {
        "grossMenu": 20139.100000000035,
        "net": 16064.119999999875,
        "netSC": 16377.7799999999,
        "netSCTax": 17341.54000000003
      }
    },
    "payout": {
      "grab": 8145.519999999989,
      "foodpanda": 14984.839999999986,
      "shopee": 18023.640000000018,
      "apps": 3484.151363285933,
      "pos": 17341.54000000003
    },
    "fees": {
      "grab": {
        "commission": 3215.66,
        "advertising": 1056.7899999999995,
        "platformFees": 164.11000000000004,
        "gateway": 0,
        "adjustments": 6.529999999999997
      },
      "foodpanda": {
        "commission": 3886.940000000001,
        "advertising": 1299.7900000000002,
        "platformFees": 30,
        "gateway": 0,
        "adjustments": -1070.4
      },
      "shopee": {
        "commission": 4538.659999999995,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 33.75
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 45.81863671406336,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 29567.949999999997,
    "netAfterCommission": 61979.69136328596,
    "commission": 7834.968636713929,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-006",
    "name": "USJ Taipan",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 92177.71999999984,
      "net": 67793.09,
      "netSC": 68301.17000000001,
      "netSCTax": 72424.29999999986
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 48545.95999999995,
        "net": 38105.75000000004,
        "netSC": 38105.75000000004,
        "netSCTax": 40392.47999999986
      },
      "foodpanda": {
        "grossMenu": 7187.4,
        "net": 4898.810000000001,
        "netSC": 4898.810000000001,
        "netSCTax": 5192.569999999999
      },
      "shopee": {
        "grossMenu": 16342.670000000002,
        "net": 10241.170000000004,
        "netSC": 10241.170000000004,
        "netSCTax": 10855.58
      },
      "apps": {
        "grossMenu": 4943.889999999998,
        "net": 3682.5800000000063,
        "netSC": 3805.580000000005,
        "netSCTax": 4082.2000000000007
      },
      "pos": {
        "grossMenu": 15157.799999999866,
        "net": 10864.779999999946,
        "netSC": 11249.85999999996,
        "netSCTax": 11901.470000000005
      }
    },
    "payout": {
      "grab": 28766.320000000003,
      "foodpanda": 4248.410000000002,
      "shopee": 8417.650000000001,
      "apps": 4029.2134763768113,
      "pos": 11901.470000000005
    },
    "fees": {
      "grab": {
        "commission": 11427.989999999994,
        "advertising": 3577.5099999999993,
        "platformFees": 593.0799999999981,
        "gateway": 0,
        "adjustments": -19.229999999999993
      },
      "foodpanda": {
        "commission": 1095.3500000000004,
        "advertising": 1099.51,
        "platformFees": 35,
        "gateway": 0,
        "adjustments": -350.33
      },
      "shopee": {
        "commission": 2110.5799999999986,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 147.97
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 52.98652362318944,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 28893.220000000016,
    "netAfterCommission": 57363.06347637682,
    "commission": 10430.02652362318,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-041",
    "name": "Anggun City",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 85857.48000000039,
      "net": 66471.82000000002,
      "netSC": 67569.72000000003,
      "netSCTax": 71742.95000000001
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 31216.03000000005,
        "net": 24605.449999999993,
        "netSC": 24605.449999999993,
        "netSCTax": 26082.180000000015
      },
      "foodpanda": {
        "grossMenu": 11225.159999999994,
        "net": 8254.639999999998,
        "netSC": 8254.639999999998,
        "netSCTax": 8749.909999999998
      },
      "shopee": {
        "grossMenu": 11309.210000000005,
        "net": 7277.499999999999,
        "netSC": 7277.499999999999,
        "netSCTax": 7714.249999999994
      },
      "apps": {
        "grossMenu": 5622.779999999994,
        "net": 4742.520000000004,
        "netSC": 4866.52,
        "netSCTax": 5335.79
      },
      "pos": {
        "grossMenu": 26484.300000000338,
        "net": 21591.710000000025,
        "netSC": 22565.61000000005,
        "netSCTax": 23860.82
      }
    },
    "payout": {
      "grab": 18347.569999999996,
      "foodpanda": 6450.690000000006,
      "shopee": 6141.109999999998,
      "apps": 5266.53201095405,
      "pos": 23860.82
    },
    "fees": {
      "grab": {
        "commission": 7279.580000000007,
        "advertising": 2083.4600000000005,
        "platformFees": 372.6599999999991,
        "gateway": 0,
        "adjustments": 314.09
      },
      "foodpanda": {
        "commission": 1805.4199999999992,
        "advertising": 799.9000000000001,
        "platformFees": 30,
        "gateway": 0,
        "adjustments": -480.06
      },
      "shopee": {
        "commission": 1529.6500000000003,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 26.02
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 69.25798904595013,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 37503.99999999999,
    "netAfterCommission": 60066.72201095405,
    "commission": 6405.097989045971,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-024",
    "name": "Simpang Ampat",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 83499.62999999987,
      "net": 64443.089999999895,
      "netSC": 65216.459999999955,
      "netSCTax": 69289.60999999993
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 30908.830000000024,
        "net": 24958.73999999999,
        "netSC": 24958.73999999999,
        "netSCTax": 26456.889999999967
      },
      "foodpanda": {
        "grossMenu": 16870.219999999972,
        "net": 12150.270000000011,
        "netSC": 12150.270000000011,
        "netSCTax": 12879.169999999984
      },
      "shopee": {
        "grossMenu": 16797.820000000007,
        "net": 10680.149999999994,
        "netSC": 10680.149999999994,
        "netSCTax": 11321.139999999985
      },
      "apps": {
        "grossMenu": 7427.759999999977,
        "net": 6232.4299999999885,
        "netSC": 6419.429999999992,
        "netSCTax": 6999.390000000003
      },
      "pos": {
        "grossMenu": 11494.999999999893,
        "net": 10421.49999999991,
        "netSC": 11007.869999999966,
        "netSCTax": 11633.019999999997
      }
    },
    "payout": {
      "grab": 18687.649999999987,
      "foodpanda": 8742.36,
      "shopee": 8176.830000000013,
      "apps": 6908.538659158566,
      "pos": 11633.019999999997
    },
    "fees": {
      "grab": {
        "commission": 7472.679999999992,
        "advertising": 2052.76,
        "platformFees": 355.6099999999994,
        "gateway": 0,
        "adjustments": 63.77000000000002
      },
      "foodpanda": {
        "commission": 2253.7300000000005,
        "advertising": 1099.55,
        "platformFees": 208,
        "gateway": 0,
        "adjustments": -475.02
      },
      "shopee": {
        "commission": 2071.8200000000047,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 81.63
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 90.85134084143738,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 24108.94,
    "netAfterCommission": 54148.39865915856,
    "commission": 10294.691340841338,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "SB-032",
    "name": "Inanam",
    "entity": "MY US PIZZA (SABAH) SDN BHD",
    "metrics": {
      "grossMenu": 83933.33999999987,
      "net": 63572.7099999999,
      "netSC": 63992.62999999993,
      "netSCTax": 64298.56999999992
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 24184.82,
        "net": 19348.550000000017,
        "netSC": 19348.550000000017,
        "netSCTax": 19348.550000000017
      },
      "foodpanda": {
        "grossMenu": 17981.399999999983,
        "net": 12658.480000000003,
        "netSC": 12658.480000000003,
        "netSCTax": 12658.480000000003
      },
      "shopee": {
        "grossMenu": 25758.739999999983,
        "net": 16428.119999999974,
        "netSC": 16428.119999999974,
        "netSCTax": 16428.119999999974
      },
      "apps": {
        "grossMenu": 3898.9800000000064,
        "net": 3080.730000000004,
        "netSC": 3135.7300000000023,
        "netSCTax": 3441.6699999999983
      },
      "pos": {
        "grossMenu": 12109.399999999896,
        "net": 12056.829999999898,
        "netSC": 12421.74999999993,
        "netSCTax": 12421.74999999993
      }
    },
    "payout": {
      "grab": 13278.040000000005,
      "foodpanda": 9985.27,
      "shopee": 12520.699999999995,
      "apps": 3396.997487933411,
      "pos": 12421.74999999993
    },
    "fees": {
      "grab": {
        "commission": 5843.089999999995,
        "advertising": 1670.9899999999996,
        "platformFees": 314.20999999999947,
        "gateway": 0,
        "adjustments": 75.80000000000001
      },
      "foodpanda": {
        "commission": 2814.3100000000004,
        "advertising": 1399.4100000000003,
        "platformFees": 6.25,
        "gateway": 0,
        "adjustments": -875.4
      },
      "shopee": {
        "commission": 3416.94,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 44.67251206658739,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 10702.508,
    "netAfterCommission": 51602.75748793334,
    "commission": 11969.952512066557,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-038",
    "name": "Batu Pahat Mall",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 79640.17000000071,
      "net": 62004.27000000028,
      "netSC": 63202.5000000002,
      "netSCTax": 67091.18999999983
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 8508.940000000004,
        "net": 6788.650000000009,
        "netSC": 6788.650000000009,
        "netSCTax": 7196.350000000006
      },
      "foodpanda": {
        "grossMenu": 16220.10999999999,
        "net": 11905.950000000008,
        "netSC": 11905.950000000008,
        "netSCTax": 12620.229999999989
      },
      "shopee": {
        "grossMenu": 14559.629999999985,
        "net": 9310.499999999998,
        "netSC": 9310.499999999998,
        "netSCTax": 9869.389999999998
      },
      "apps": {
        "grossMenu": 4102.190000000008,
        "net": 3268.2400000000066,
        "netSC": 3280.2400000000066,
        "netSCTax": 3644.5500000000006
      },
      "pos": {
        "grossMenu": 36249.30000000072,
        "net": 30730.930000000262,
        "netSC": 31917.160000000174,
        "netSCTax": 33760.66999999984
      }
    },
    "payout": {
      "grab": 5079.719999999998,
      "foodpanda": 10500.840000000002,
      "shopee": 7767.079999999998,
      "apps": 3597.244127021975,
      "pos": 33760.66999999984
    },
    "fees": {
      "grab": {
        "commission": 2033.5399999999995,
        "advertising": 770.1899999999998,
        "platformFees": 68.99999999999999,
        "gateway": 0,
        "adjustments": 0
      },
      "foodpanda": {
        "commission": 2668.330000000001,
        "advertising": 799.8399999999999,
        "platformFees": 30,
        "gateway": 0,
        "adjustments": -472.93
      },
      "shopee": {
        "commission": 1955.4399999999991,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 22.3
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 47.30587297802549,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 22687.110000000008,
    "netAfterCommission": 60705.55412702181,
    "commission": 1298.7158729784717,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-001",
    "name": "Kelana Jaya",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 78582.26999999983,
      "net": 58607.89999999988,
      "netSC": 59221.869999999915,
      "netSCTax": 62832.159999999974
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 34397.709999999985,
        "net": 27065.299999999967,
        "netSC": 27065.299999999967,
        "netSCTax": 28689.489999999976
      },
      "foodpanda": {
        "grossMenu": 11512.14,
        "net": 8010.249999999998,
        "netSC": 8010.249999999998,
        "netSCTax": 8490.800000000001
      },
      "shopee": {
        "grossMenu": 11245.249999999987,
        "net": 7209.089999999994,
        "netSC": 7209.089999999994,
        "netSCTax": 7641.6
      },
      "apps": {
        "grossMenu": 5922.469999999996,
        "net": 4908.499999999998,
        "netSC": 5052.5,
        "netSCTax": 5440.88
      },
      "pos": {
        "grossMenu": 15504.699999999864,
        "net": 11414.759999999918,
        "netSC": 11884.72999999995,
        "netSCTax": 12569.39
      }
    },
    "payout": {
      "grab": 20403.69,
      "foodpanda": 6954.579999999999,
      "shopee": 5984.4100000000035,
      "apps": 5370.25795388493,
      "pos": 12569.39
    },
    "fees": {
      "grab": {
        "commission": 8077.420000000002,
        "advertising": 2432.06,
        "platformFees": 421.4599999999987,
        "gateway": 0,
        "adjustments": 312.46000000000004
      },
      "foodpanda": {
        "commission": 1806.9600000000005,
        "advertising": 1599.2400000000002,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -219.5
      },
      "shopee": {
        "commission": 1502.3399999999997,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 50.53000000000001
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 70.62204611506968,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 22044.730000000003,
    "netAfterCommission": 51282.32795388494,
    "commission": 7325.572046114939,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-039",
    "name": "Gamuda Cove",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 72754.10000000078,
      "net": 58309.09000000009,
      "netSC": 60379.48000000004,
      "netSCTax": 64105.17999999996
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 27030.930000000015,
        "net": 21792.05999999998,
        "netSC": 21792.05999999998,
        "netSCTax": 23099.710000000006
      },
      "foodpanda": {
        "grossMenu": 1667.7099999999996,
        "net": 1148.36,
        "netSC": 1148.36,
        "netSCTax": 1217.2800000000002
      },
      "shopee": {
        "grossMenu": 1596.55,
        "net": 980.9799999999998,
        "netSC": 980.9799999999998,
        "netSCTax": 1039.8000000000002
      },
      "apps": {
        "grossMenu": 5678.209999999995,
        "net": 4932.19,
        "netSC": 5024.19,
        "netSCTax": 5547.319999999998
      },
      "pos": {
        "grossMenu": 36780.70000000077,
        "net": 29455.500000000113,
        "netSC": 31433.89000000006,
        "netSCTax": 33201.069999999956
      }
    },
    "payout": {
      "grab": 16511.079999999998,
      "foodpanda": 1055.63,
      "shopee": 836.86,
      "apps": 5475.316373958797,
      "pos": 33201.069999999956
    },
    "fees": {
      "grab": {
        "commission": 6371.210000000005,
        "advertising": 1841.55,
        "platformFees": 277.58999999999946,
        "gateway": 0,
        "adjustments": 100.05
      },
      "foodpanda": {
        "commission": 263.17,
        "advertising": 444.3900000000001,
        "platformFees": 30,
        "gateway": 0,
        "adjustments": -57.68000000000001
      },
      "shopee": {
        "commission": 171.57999999999998,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 50.35
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 72.00362604120073,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 17141.030000000002,
    "netAfterCommission": 57079.956373958754,
    "commission": 1229.1336260413373,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-018",
    "name": "Simee Ipoh",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 80164.47000000003,
      "net": 57679.69000000003,
      "netSC": 57975.62000000003,
      "netSCTax": 61576.32999999996
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 22166.510000000024,
        "net": 17511.600000000002,
        "netSC": 17511.600000000002,
        "netSCTax": 18562.64999999998
      },
      "foodpanda": {
        "grossMenu": 9824.469999999996,
        "net": 7140.989999999997,
        "netSC": 7140.989999999997,
        "netSCTax": 7569.430000000002
      },
      "shopee": {
        "grossMenu": 36656.11000000003,
        "net": 23688.630000000034,
        "netSC": 23688.630000000034,
        "netSCTax": 25110.989999999976
      },
      "apps": {
        "grossMenu": 4777.580000000004,
        "net": 3937.850000000009,
        "netSC": 4013.8500000000063,
        "netSCTax": 4388.709999999998
      },
      "pos": {
        "grossMenu": 6739.799999999977,
        "net": 5400.6199999999935,
        "netSC": 5620.549999999993,
        "netSCTax": 5944.550000000002
      }
    },
    "payout": {
      "grab": 12876.579999999996,
      "foodpanda": 4979.369999999998,
      "shopee": 19197.57000000005,
      "apps": 4331.745009041611,
      "pos": 5944.550000000002
    },
    "fees": {
      "grab": {
        "commission": 5200.310000000003,
        "advertising": 392.54,
        "platformFees": 268.71999999999963,
        "gateway": 0,
        "adjustments": 2.12
      },
      "foodpanda": {
        "commission": 1294.5399999999995,
        "advertising": 1099.98,
        "platformFees": 162.5,
        "gateway": 0,
        "adjustments": -262.5
      },
      "shopee": {
        "commission": 4869.250000000012,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 105.47
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 56.96499095838681,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 25025.67,
    "netAfterCommission": 47329.81500904166,
    "commission": 10349.874990958371,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-022",
    "name": "Raja Uda",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 74684.12999999992,
      "net": 57532.629999999896,
      "netSC": 58203.77999999993,
      "netSCTax": 61795.84
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 28102.860000000022,
        "net": 22608.46,
        "netSC": 22608.46,
        "netSCTax": 23965.33000000001
      },
      "foodpanda": {
        "grossMenu": 15338.640000000018,
        "net": 10667.47,
        "netSC": 10667.47,
        "netSCTax": 11307.339999999998
      },
      "shopee": {
        "grossMenu": 12056.340000000013,
        "net": 7552.409999999995,
        "netSC": 7552.409999999995,
        "netSCTax": 8005.919999999997
      },
      "apps": {
        "grossMenu": 6082.93999999998,
        "net": 4695.81,
        "netSC": 4800.809999999996,
        "netSCTax": 5222.229999999991
      },
      "pos": {
        "grossMenu": 13103.349999999884,
        "net": 12008.479999999903,
        "netSC": 12574.62999999994,
        "netSCTax": 13295.02
      }
    },
    "payout": {
      "grab": 16866.060000000016,
      "foodpanda": 9320.509999999997,
      "shopee": 6365.7800000000025,
      "apps": 5154.446007726039,
      "pos": 13295.02
    },
    "fees": {
      "grab": {
        "commission": 6753.819999999999,
        "advertising": 2117.3900000000003,
        "platformFees": 290.27999999999935,
        "gateway": 0,
        "adjustments": 86.63
      },
      "foodpanda": {
        "commission": 2455.98,
        "advertising": 1599.42,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -743.29
      },
      "shopee": {
        "commission": 1580.9200000000023,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 51.2
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 67.78399227395221,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 24717.22,
    "netAfterCommission": 51001.816007726055,
    "commission": 6530.813992273841,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-034",
    "name": "Banting",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 75510.38000000027,
      "net": 56918.99999999984,
      "netSC": 57626.70999999993,
      "netSCTax": 61130.110000000015
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 14077.460000000015,
        "net": 11226.530000000002,
        "netSC": 11226.530000000002,
        "netSCTax": 11899.62
      },
      "foodpanda": {
        "grossMenu": 0,
        "net": 0,
        "netSC": 0,
        "netSCTax": 0
      },
      "shopee": {
        "grossMenu": 11170.050000000005,
        "net": 7295.34,
        "netSC": 7295.34,
        "netSCTax": 7733.129999999999
      },
      "apps": {
        "grossMenu": 27233.77000000006,
        "net": 20515.819999999956,
        "netSC": 20573.81999999997,
        "netSCTax": 21893.400000000005
      },
      "pos": {
        "grossMenu": 23029.100000000173,
        "net": 17881.30999999988,
        "netSC": 18531.019999999953,
        "netSCTax": 19603.960000000003
      }
    },
    "payout": {
      "grab": 8206.420000000004,
      "foodpanda": 13553.770000000006,
      "shopee": 6025.049999999996,
      "apps": 21609.2259868963,
      "pos": 19603.960000000003
    },
    "fees": {
      "grab": {
        "commission": 3439.920000000002,
        "advertising": 807.85,
        "platformFees": 124.64000000000016,
        "gateway": 0,
        "adjustments": 186.55
      },
      "foodpanda": {
        "commission": 3553.7299999999987,
        "advertising": 1299.83,
        "platformFees": 30,
        "gateway": 0,
        "adjustments": -643.5699999999999
      },
      "shopee": {
        "commission": 1493.9499999999996,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 121.66
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 284.17401310370406,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 26569.49999999999,
    "netAfterCommission": 68998.42598689631,
    "commission": -12079.425986896473,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-016",
    "name": "Skudai",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 71384.38000000005,
      "net": 51855.27000000003,
      "netSC": 52095.480000000025,
      "netSCTax": 55207.03999999994
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 27111.02000000005,
        "net": 21509.980000000003,
        "netSC": 21509.980000000003,
        "netSCTax": 22801.119999999963
      },
      "foodpanda": {
        "grossMenu": 12678.150000000003,
        "net": 8783.430000000013,
        "netSC": 8783.430000000013,
        "netSCTax": 9310.23
      },
      "shopee": {
        "grossMenu": 24104.239999999983,
        "net": 15167.69,
        "netSC": 15167.69,
        "netSCTax": 16078.049999999985
      },
      "apps": {
        "grossMenu": 3392.5700000000065,
        "net": 2863.2000000000044,
        "netSC": 2921.2000000000025,
        "netSCTax": 3092.6199999999976
      },
      "pos": {
        "grossMenu": 4098.4000000000115,
        "net": 3530.9700000000107,
        "netSC": 3713.1799999999994,
        "netSCTax": 3925.019999999996
      }
    },
    "payout": {
      "grab": 15692.170000000002,
      "foodpanda": 7258.089999999998,
      "shopee": 12377.190000000031,
      "apps": 3052.4781199628733,
      "pos": 3925.019999999996
    },
    "fees": {
      "grab": {
        "commission": 6206.760000000001,
        "advertising": 778.1999999999998,
        "platformFees": 277.9699999999996,
        "gateway": 0,
        "adjustments": 176.35
      },
      "foodpanda": {
        "commission": 1925.13,
        "advertising": 1300.0099999999998,
        "platformFees": 110,
        "gateway": 0,
        "adjustments": -618.64
      },
      "shopee": {
        "commission": 3142.0699999999974,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 72.05
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 40.14188003712434,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 25252.44,
    "netAfterCommission": 42304.9481199629,
    "commission": 9550.321880037132,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-011",
    "name": "Kota Laksamana",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 67732.72000000002,
      "net": 49109.280000000006,
      "netSC": 49354.3,
      "netSCTax": 52325.039999999935
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 26686.820000000014,
        "net": 21042.29000000001,
        "netSC": 21042.29000000001,
        "netSCTax": 22305.039999999964
      },
      "foodpanda": {
        "grossMenu": 11414.349999999997,
        "net": 7970.590000000005,
        "netSC": 7970.590000000005,
        "netSCTax": 8448.659999999996
      },
      "shopee": {
        "grossMenu": 0,
        "net": 0,
        "netSC": 0,
        "netSCTax": 0
      },
      "apps": {
        "grossMenu": 24493.85,
        "net": 15708.869999999988,
        "netSC": 15767.869999999984,
        "netSCTax": 16734.569999999978
      },
      "pos": {
        "grossMenu": 5137.7,
        "net": 4387.530000000009,
        "netSC": 4573.549999999999,
        "netSCTax": 4836.769999999996
      }
    },
    "payout": {
      "grab": 15913.170000000007,
      "foodpanda": 6941.340000000004,
      "shopee": 11795.580000000033,
      "apps": 16517.357053885404,
      "pos": 4836.769999999996
    },
    "fees": {
      "grab": {
        "commission": 6333.450000000004,
        "advertising": 1809.4600000000005,
        "platformFees": 292.6099999999996,
        "gateway": 0,
        "adjustments": 115.83
      },
      "foodpanda": {
        "commission": 1790.0599999999995,
        "advertising": 1099.9999999999998,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -411.46
      },
      "shopee": {
        "commission": 3008.2999999999965,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 20.5
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 217.21294611457415,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 23730.389999999996,
    "netAfterCommission": 56004.21705388544,
    "commission": -6894.937053885435,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-033",
    "name": "Mydin Subang Jaya",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 69117.26000000042,
      "net": 48872.48999999998,
      "netSC": 48910.48999999998,
      "netSCTax": 51902.12999999989
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 13103.740000000002,
        "net": 10333.22,
        "netSC": 10333.22,
        "netSCTax": 10953.330000000002
      },
      "foodpanda": {
        "grossMenu": 8219.470000000003,
        "net": 5251.200000000001,
        "netSC": 5251.200000000001,
        "netSCTax": 5566.210000000001
      },
      "shopee": {
        "grossMenu": 11611.589999999993,
        "net": 7318.879999999997,
        "netSC": 7318.879999999997,
        "netSCTax": 7758.11
      },
      "apps": {
        "grossMenu": 3741.360000000005,
        "net": 2560.6400000000026,
        "netSC": 2598.640000000002,
        "netSCTax": 2811.5099999999975
      },
      "pos": {
        "grossMenu": 32441.10000000042,
        "net": 23408.549999999985,
        "netSC": 23408.549999999985,
        "netSCTax": 24812.969999999892
      }
    },
    "payout": {
      "grab": 7684.289999999994,
      "foodpanda": 4589.200000000003,
      "shopee": 5948.400000000001,
      "apps": 2775.016897988378,
      "pos": 24812.969999999892
    },
    "fees": {
      "grab": {
        "commission": 3083.8999999999983,
        "advertising": 817.4199999999998,
        "platformFees": 199.50999999999985,
        "gateway": 0,
        "adjustments": 4.440892098500626e-16
      },
      "foodpanda": {
        "commission": 1168.98,
        "advertising": 799.6700000000001,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": -357.93
      },
      "shopee": {
        "commission": 1501.7699999999995,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 60.27
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 36.49310201161961,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 16950.350000000006,
    "netAfterCommission": 45809.876897988266,
    "commission": 3062.6131020117173,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-075",
    "name": "Hextar World Empire City",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 60839.10999999993,
      "net": 42485.18999999998,
      "netSC": 42633.18999999998,
      "netSCTax": 45201.06999999998
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 17672.570000000007,
        "net": 13819.15000000002,
        "netSC": 13819.15000000002,
        "netSCTax": 14648.58999999999
      },
      "foodpanda": {
        "grossMenu": 6062.499999999995,
        "net": 3896.579999999998,
        "netSC": 3896.579999999998,
        "netSCTax": 4130.359999999997
      },
      "shopee": {
        "grossMenu": 12926.649999999992,
        "net": 8340.320000000005,
        "netSC": 8340.320000000005,
        "netSCTax": 8840.729999999994
      },
      "apps": {
        "grossMenu": 5946.7899999999945,
        "net": 3205.5300000000057,
        "netSC": 3353.5300000000047,
        "netSCTax": 3564.2199999999984
      },
      "pos": {
        "grossMenu": 18230.599999999944,
        "net": 13223.609999999948,
        "netSC": 13223.609999999948,
        "netSCTax": 14017.170000000004
      }
    },
    "payout": {
      "grab": 10309.969999999996,
      "foodpanda": 3367.230000000001,
      "shopee": 6962.530000000002,
      "apps": 3517.9568019136127,
      "pos": 14017.170000000004
    },
    "fees": {
      "grab": {
        "commission": 4094.749999999999,
        "advertising": 915.3,
        "platformFees": 220.8599999999997,
        "gateway": 0,
        "adjustments": 131.62
      },
      "foodpanda": {
        "commission": 865.9999999999997,
        "advertising": 300,
        "platformFees": 30,
        "gateway": 0,
        "adjustments": -410.31
      },
      "shopee": {
        "commission": 1729.9399999999969,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 136.89
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 46.26319808638573,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 14590.23,
    "netAfterCommission": 38174.856801913615,
    "commission": 4310.333198086366,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-025",
    "name": "Tanjung Tokong",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 51153.57000000003,
      "net": 39628.420000000035,
      "netSC": 39804.310000000034,
      "netSCTax": 42217.84000000002
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 30619.540000000023,
        "net": 24281.270000000033,
        "netSC": 24281.270000000033,
        "netSCTax": 25738.33000000002
      },
      "foodpanda": {
        "grossMenu": 3226.100000000001,
        "net": 2230.7899999999995,
        "netSC": 2230.7899999999995,
        "netSCTax": 2364.4900000000007
      },
      "shopee": {
        "grossMenu": 9427.440000000002,
        "net": 5899.5799999999945,
        "netSC": 5899.5799999999945,
        "netSCTax": 6253.740000000002
      },
      "apps": {
        "grossMenu": 3363.590000000004,
        "net": 2783.2500000000027,
        "netSC": 2836.2500000000023,
        "netSCTax": 3038.9499999999985
      },
      "pos": {
        "grossMenu": 4516.900000000008,
        "net": 4433.530000000007,
        "netSC": 4556.420000000005,
        "netSCTax": 4822.329999999993
      }
    },
    "payout": {
      "grab": 18393.190000000017,
      "foodpanda": 1940.26,
      "shopee": 5029.570000000003,
      "apps": 2999.504750878277,
      "pos": 4822.329999999993
    },
    "fees": {
      "grab": {
        "commission": 7345.980000000006,
        "advertising": 2046.7799999999995,
        "platformFees": 383.87999999999903,
        "gateway": 0,
        "adjustments": 108.94999999999996
      },
      "foodpanda": {
        "commission": 506.28000000000014,
        "advertising": 903.2600000000002,
        "platformFees": 35,
        "gateway": 0,
        "adjustments": -346.97999999999996
      },
      "shopee": {
        "commission": 1265.9900000000007,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 35.97
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 39.445249121721645,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 18575.01,
    "netAfterCommission": 33184.85475087829,
    "commission": 6443.565249121748,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  },
  {
    "code": "MY-014",
    "name": "Batu Pahat",
    "entity": "MY US PIZZA SDN BHD",
    "metrics": {
      "grossMenu": 52330.51999999995,
      "net": 39003.37999999999,
      "netSC": 39385.31999999999,
      "netSCTax": 41765.73
    },
    "byPlatform": {
      "grab": {
        "grossMenu": 13363.529999999992,
        "net": 10640.030000000008,
        "netSC": 10640.030000000008,
        "netSCTax": 11278.760000000006
      },
      "foodpanda": {
        "grossMenu": 13537.53000000001,
        "net": 9543.18000000001,
        "netSC": 9543.18000000001,
        "netSCTax": 10115.419999999998
      },
      "shopee": {
        "grossMenu": 15191.470000000005,
        "net": 9555.22000000001,
        "netSC": 9555.22000000001,
        "netSCTax": 10128.659999999983
      },
      "apps": {
        "grossMenu": 1624.690000000001,
        "net": 1281.61,
        "netSC": 1318.61,
        "netSCTax": 1435.6799999999994
      },
      "pos": {
        "grossMenu": 8613.299999999945,
        "net": 7983.3399999999565,
        "netSC": 8328.279999999966,
        "netSCTax": 8807.210000000005
      }
    },
    "payout": {
      "grab": 7968.609999999996,
      "foodpanda": 8340.639999999998,
      "shopee": 8082.839999999987,
      "apps": 1417.0450256637737,
      "pos": 8807.210000000005
    },
    "fees": {
      "grab": {
        "commission": 3181.4300000000007,
        "advertising": 743.8,
        "platformFees": 114.72000000000013,
        "gateway": 0,
        "adjustments": -8.14
      },
      "foodpanda": {
        "commission": 2132.890000000001,
        "advertising": 1399.62,
        "platformFees": 75,
        "gateway": 0,
        "adjustments": -447.66
      },
      "shopee": {
        "commission": 2045.8199999999988,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 23
      },
      "apps": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 18.634974336225696,
        "adjustments": 0
      },
      "pos": {
        "commission": 0,
        "advertising": 0,
        "platformFees": 0,
        "gateway": 0,
        "adjustments": 0
      }
    },
    "purchases": 17661.11,
    "netAfterCommission": 34616.34502566376,
    "commission": 4387.034974336231,
    "reports": {
      "POS": true,
      "Grab": true,
      "FoodPanda": true,
      "Shopee": true,
      "Web": true
    },
    "missingReports": [],
    "missingPos": false
  }
];
