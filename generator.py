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

"""Generates fake funnel cohort data for demo purposes."""

import csv
import datetime
import math
import random
import string
import sys



COLUMNS = [
  'Cohort group type',
  'Cohort group value',
  'Cohort day',
  'Born',
  'Updated profile',
  'Sent first message',
  'Unlocked first achievement',
  'Made two posts',
]
# For profiling viz performance
# ] + [
#  'State ' + a for a in string.ascii_lowercase
# ]


out = csv.writer(sys.stdout)
out.writerow(COLUMNS)

group_types = [
  ('Total', ['']),
  ('Sign-up referrer', ['Email', 'Search', 'Coupon', 'Tweet']),
  ('Favorite feature', ['Chat', 'Reading news', 'Fun facts', 'Polls']),
  # For profiling viz performance
  # ('Big Random', ['Value ' + a for a in string.ascii_lowercase]),
]

duration = 150
step = math.pi / duration / 2
wave_start = {}
wave_size = {}
wave_period = {}
dropped = {}
peaked = {}


def do_wave(group, state, i, x):
  # Create a new random wave starting point if it doesn't exist.
  if i not in wave_start:
    wave_period[i] = max(1, random.random() * 1.5)
    wave_start[i] = math.pi + random.random() * math.pi
    wave_size[i] = max(100, 500 * random.random())

  # Mix in a random peak
  if (group not in peaked and
      x > (1.0 * duration / 3.0) and
      random.random() > 0.95):
    amount = max(2, random.random() * 4)
    peaked[group] = (state, x, amount)

  # Mix in a random drop
  if (group not in dropped and
      x > (2.0 * duration / 3.0) and
      random.random() > 0.95):
    sign = round(-random.random()) or 1.0
    amount = max(3, random.random() * 5) ** sign
    dropped[group] = (state, x, amount)

  # Apply size adjustments
  size = wave_size[i]
  if group in peaked:
    peaked_state, peaked_x, amount = peaked[group]
    peak_length = duration / 15.0
    if state == peaked_state and peaked_x < x < (peaked_x + peak_length):
      offset = (x - peaked_x) / peak_length
      amount *= 2 + math.cos(math.pi + 2 * math.pi * offset)
      size *= amount

  if group in dropped:
    drop_state, drop_x, amount = dropped[group]
    if state == drop_state and x > drop_x:
      size *= amount

  # Adjust the X axis for the period of the wave, which may be less than
  # duration to make things look out of phase.
  radians = wave_start[i] + x * step * wave_period[i]

  # Mix in random noise
  noise = math.cos(radians) * random.random()

  return int(
    (1 + math.cos(radians) + noise) * size
  )


start = datetime.date.today() - datetime.timedelta(days=duration)

for type_number, group in enumerate(group_types):
  group_type, value_list = group

  for value_number, group_value in enumerate(value_list):
    wave_index = (type_number * 100) + value_number

    for x in xrange(duration):
      cohort_day = start + datetime.timedelta(days=x)
      cohort = cohort_day.strftime('%m/%d/%y')

      row = [
        group_type,
        group_value,
        cohort,
      ]
      for i in xrange(len(COLUMNS) - 3):
        row.append(do_wave(type_number, i, wave_index + i, x))

      out.writerow(row)
