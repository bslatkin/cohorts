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

group_types = [
  ('Total', ['']),
  ('Sign-up referrer', ['Email', 'Search', 'Coupon', 'Tweet']),
  ('Favorite feature', ['Chat', 'Reading news', 'Fun facts', 'Polls']),
]

duration = 30
step = math.pi / duration / 2
wave_start = {}
wave_size = {}

def do_wave(i, x):
  # Create a new random wave starting point if it doesn't exist.
  if i not in wave_start:
    wave_start[i] = random.random() * -math.pi + 3 * len(wave_start) * step
    wave_size[i] = len(wave_start) * 50 * random.random()

  return int(
    (1 + math.cos(wave_start[i] + x * step)) * wave_size[i]
  )


start = datetime.date.today() - datetime.timedelta(days=duration)

for type_number, group in enumerate(group_types):
  group_type, value_list = group

  for value_number, group_value in enumerate(value_list):
    wave_index = (type_number * 100) + value_number

    for x in xrange(duration):
      cohort_day = start + datetime.timedelta(days=x)
      cohort = cohort_day.strftime('%m/%d/%y')

      out.writerow([
        group_type,
        group_value,
        cohort,
        do_wave(wave_index, x),
        do_wave(wave_index + 1, x),
        do_wave(wave_index + 2, x),
        do_wave(wave_index + 3, x),
        do_wave(wave_index + 4, x),
      ])
