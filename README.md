# YupX

```

      _____                    _____                    _____
     |\    \                  /\    \                  /\    \                 ______
     |:\____\                /::\____\                /::\    \               |::|   |
     |::|   |               /:::/    /               /::::\    \              |::|   |
     |::|   |              /:::/    /               /::::::\    \             |::|   |
     |::|   |             /:::/    /               /:::/\:::\    \            |::|   |
     |::|   |            /:::/    /               /:::/__\:::\    \           |::|   |
     |::|   |           /:::/    /               /::::\   \:::\    \          |::|   |
     |::|___|______    /:::/    /      _____    /::::::\   \:::\    \         |::|   |
     /::::::::\    \  /:::/____/      /\    \  /:::/\:::\   \:::\____\  ______|::|___|___ ____
    /::::::::::\____\|:::|    /      /::\____\/:::/  \:::\   \:::|    ||:::::::::::::::::|    |
   /:::/~~~~/~~      |:::|____\     /:::/    /\::/    \:::\  /:::|____||:::::::::::::::::|____|
  /:::/    /          \:::\    \   /:::/    /  \/_____/\:::\/:::/    /  ~~~~~~|::|~~~|~~~
 /:::/    /            \:::\    \ /:::/    /            \::::::/    /         |::|   |
/:::/    /              \:::\    /:::/    /              \::::/    /          |::|   |
\::/    /                \:::\__/:::/    /                \::/____/           |::|   |
 \/____/                  \::::::::/    /                  ~~                 |::|   |
                           \::::::/    /                                      |::|   |
                            \::::/    /                                       |::|   |
                             \::/____/                                        |::|___|
                              ~~                                               ~~
```

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

- [Quick Start](#quick-start)
- [Description](#description)
- [Authors](#authors)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

- [Quick Start](#quick-start)
- [Description](#description)
- [Authors](#authors)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Quick Start

Check out our [recipes repo](https://github.com/symmetric-so/yup-x-recipes) to learn how everything works.

## Description

YupX lets you deploy an API for your backend using just yup schemas.

Essentially, it does all the work to turn this:

```javascript
const personSchema = yup.object({
  firstName: yup.string().defined(),
  nickName: yup.string().default('').nullable(),
  sex: yup
    .mixed()
    .oneOf(['male', 'female', 'other'] as const)
    .defined(),
  email: yup.string().nullable().email(),
  birthDate: yup.date().nullable().min(new Date(1900, 0, 1)),
});
```

Into this:

```javascript
const express = require('express');
const yup = require('yup');
const router = express.Router();

// Create (POST)
router.post('/person', async (req, res) => {
	// ...
});

// Read (GET)
router.get('/person/:id', async (req, res) => {
	// ...
});

// Update (PUT)
router.put('/person/:id', async (req, res) => {
	// ...
});

// Delete (DELETE)
router.delete('/person/:id', async (req, res) => {
	// ...
});

module.exports = router;
```

## Authors

- [Kamar Mack](https://github.com/kamarmack)
- [Saatvik Mohan](https://github.com/saatvikmohan)

## License

BSD-3-Clause
