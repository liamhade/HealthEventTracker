# Health Event Tracker

# Goal

The purpose of this project is to create a web-based application that I can easily use from my iPhone to track my health events. The app doesn't need to be hyper tailored to "health" tracking neccessarily, but that is what I'll use it for.

Users can log "events", which are objects that have a `title`, `description` (supporting either text or image), a `tag` (a set of options that users can update or remove). If users define the event has a `span`, then it has a `start_time` and `end_time`. But if it is not a `span` "event", then there is only `time`, which is the default.

# Non-Goals

# Requirements

- The platform supports multiple users logging in.
- Users can take a picture with their device and upload that to the `description` section
- Multiple events can overlap in time
- Three main screens
	1. The `log` screen, which is essentially the hero page that just has a button that says log.
	2. The `calendar` view, which shows your events in a G-cal style in a calendar
	3. A `list` view which displays the events in chronological order.

# Tech Stack

**DB**: I'm thinking Supabase since I've used that in the past, and it easy supports OAuth authentication and images.

# Future Features

- LLM integration to look for insights in the data.
- Ability to import data from a health device. 

# Design Choices

# Open Questions