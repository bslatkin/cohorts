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

"""Generates fake usage and retention cohort data for demo purposes."""

import csv
import datetime
import math
import random
import string
import sys

duration = 300

COLUMNS = [
  'Cohort group type',
  'Cohort group value',
  'Cohort day',
] + [
  'Month %d' % i for i in xrange(duration / 30 - 1, -1, -1)
]

out = csv.writer(sys.stdout)
out.writerow(COLUMNS)

FUNNEL_STATES = [
  'Born',
  'Updated profile',
  'Sent first message',
  'Unlocked first achievement',
  'Made two posts',
]

group_types = [
  ('Last active day', FUNNEL_STATES),
  ('Lifespan', FUNNEL_STATES),
]

step = math.pi / duration / 2
wave_start = {}
wave_size = {}
wave_period = {}
peaked = {}
max_wave = {}
total_value = {}


def do_wave(group, value, state, i, x):
  # Create a new random wave starting point if it doesn't exist.
  # Share this across all values.
  if value not in wave_start:
    wave_period[value] = max(1, random.random() * 1.5)
    wave_start[value] = math.pi + random.random() * math.pi
    wave_size[value] = max(100, 100 * random.random())

  # Mix in a random peak
  if (group not in peaked and
      x > (1.0 * duration / 3.0) and
      random.random() > 0.95):
    amount = max(1, random.random() * 2)
    peaked[group] = (state, x, amount)

  # Apply size adjustments
  size = wave_size[value]
  if group in peaked:
    peaked_state, peaked_x, amount = peaked[group]
    peak_length = duration / 15.0
    if state == peaked_state and peaked_x < x < (peaked_x + peak_length):
      offset = (x - peaked_x) / peak_length
      amount *= 2 + math.cos(math.pi + 2 * math.pi * offset)
      size *= amount

  # Adjust the X axis for the period of the wave, which may be less than
  # duration to make things look out of phase.
  radians = wave_start[value] + x * step * wave_period[value]

  # Mix in random noise
  noise = math.cos(radians) * random.random()

  return max(0, int(
    (1 + math.cos(radians) + noise) * size
  ))


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
        # Last active day should be the downward ramp.
        x_churn_start = (30 * (i+1))
        x_start = (30 * i)
        if x < x_churn_start:
          if x < x_start:
            # Not active until it's our month
            row.append(0)
          else:
            # i is "months back"; only output if this cohort is live.
            # This works for sign-up day.
            next_value = do_wave(type_number, value_number, i, wave_index + i, x)
            total_value[i] = total_value.get(i, 0) + next_value
            row.append(next_value)

        else:
          if total_value.get(i, 0) <= 0:
            row.append(0)
          else:
            # After churn we slowly ramp down for the remainder
            distance = float(x - x_churn_start) / duration * 0.8
            adjustment = (1 + -math.cos(math.pi * distance)) / 2
            level = do_wave(type_number, value_number, i, wave_index + i, x)
            next_value = int(adjustment * level)
            next_value = min(next_value, total_value[i])
            total_value[i] -= next_value
            row.append(-next_value)

      out.writerow(row)
