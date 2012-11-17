#!/usr/bin/env python
#
# Copyright 2012 Brett Slatkin
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Generates fake cohort data for demo purposes."""

import csv
import datetime
import math
import random
import sys


out = csv.writer(sys.stdout)
out.writerow([
  'Cohort group type',
  'Cohort group value',
  'Cohort day',
  'Born',
  'Updated profile',
  'Sent first message',
  'Unlocked first achievement',
  'Made two posts',
])

group_types = {
  'Total': [''],
  'Sign-up referrer': ['Email', 'Search', 'Coupon', 'Tweet'],
  'Favorite feature': ['Chat', 'Reading news', 'Fun facts', 'Polls'],
}

duration = 30
step = math.pi / duration / 2
wave_start = [
  random.random() * -math.pi,
  random.random() * -math.pi,
  random.random() * -math.pi,
  random.random() * -math.pi,
  random.random() * -math.pi,
]
wave_size = [
  150 * random.random(),
  125 * random.random(),
  100 * random.random(),
  75 * random.random(),
  50 * random.random(),
]

def do_wave(i, x):
  return int(
    (1 + math.cos(wave_start[i] + x * step)) * wave_size[i]
  )


start = datetime.date.today() - datetime.timedelta(days=duration)

for i in xrange(duration):
  cohort_day = start + datetime.timedelta(days=i)
  # TODO: Generate group types
  # for group_type, value_list in group_types.iteritems():
  #   for value in value_list:
  out.writerow([
    'Total',
    '',
    cohort_day.strftime('%m/%d/%y'),
    do_wave(0, i),
    do_wave(1, i),
    do_wave(2, i),
    do_wave(3, i),
    do_wave(4, i),
  ])
