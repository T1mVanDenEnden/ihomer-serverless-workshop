# crypto-exchange-serverless-workshop

## Prerequisites

### Node

Make sure you have installed a version of Node 16. Node can be installed via: https://nodejs.org/en/download/

### Serverless

After installing Node we should install the serverless framework. This can be done by
running `npm install -g serverless`. You can check if the installation was successful by running `sls -v`. Any version
above `3.0.0` should be fine.

### Docker

Make sure to install Docker Desktop. We will use this to run a local instance of DynamoDb. DynamoDb is a NoSQL database 
service in AWS.

The Docker website has some great resources: https://www.docker.com/get-started.

_NOTE: To use Docker on Windows, you need to enable Hyper-V in BIOS. Every BIOS has its own way to do this. It is also 
known as virtualization._

### Useful for the excercises

- [Serverless framework documentation](https://www.serverless.com/framework/docs/)

### Create a `.env` file in the `sls` directory

```dotenv
DYNAMO_URL='http://localhost:8000'
DYNAMO_TABLE='wallet'
REGION='eu-central-1'
AWS_ACCESS_KEY_ID='fake-id'
AWS_SECRET_ACCESS_KEY='fake-key'
```

Because we are developing locally, real AWS credentials are not needed.

## Exercises

### #0 - Setup

We will start by creating a local "cryptocurrency wallet". This wallet will run in a local DynamoDb instance. The
instance will be used by the locally run serverless application to store your personal wallet information. The
serverless application will also use an online API to validate requests to the "cryptocurrency exchange".

#### Setting up dynamo

The DynamoDb instance can be started by running `docker-compose up` inside the `sls` directory. This will run both the
instance and an admin GUI on:

```
dynamodb-local: http://localhost:8000
dynamodb-admin: http://localhost:8001
```

_TIP: You can use `docker-compose up -d` to run the Docker container detached. This way, you won't have to open a new terminal
for other command line commands._

With the DynamoDb instance started we should create a table.

* Navigate to the admin GUI on http://localhost:8001.
* Hit the 'Create table' button
* Fill in the form
    * Table Name = wallet
    * Hash Attribute Name = pk
    * Hash Attribute Type = String

After submitting, the new table will be created. Do not add any data yet, first we will have to register at the
crypto exchange. We will do this by going to the following url: https://api.workshop.ihomer.nl/api/register. We will see a
response giving us a `uniqueId`. We will use this `uniqueId` as our `pk` for the DynamoDb record.

In the admin GUI we will do the following.

* Hit the 'Create item' button in the top right corner
* Insert:

```json
{
    "pk": "<<insert your uniqueId>>"
}
```

* Hit the 'Save' button

We will also add this `uniqueId` to our `.env` file in the `sls` directory.

```dotenv
...
UNIQUE_ID='<<insert your uniqueId>>'
```

#### Running the serverless backend

To run the serverless application, install all project dependencies with the `npm install` command, from inside the `sls` directory. Then, run `sls offline start`. This will start the serverless backend locally and it will mock the AWS services we are using. You will notice that the program will emit logs. Why this is happening, will become clear in the next step.

_NOTE: If you are using Powershell, the `sls` command might not work. Use `serverless` instead._

#### Running the frontend

We can also run the frontend project. To do this first run `npm install` inside the `frontend` directory and after this
run `npm run start`. This wil run the React frontend on `localhost:4000`. **Do not worry**, we will not be editing this
project (no scary CSS) we will only use it to interact with the API we will develop during this workshop.

#### Finished

We have now finished setting up the project for any further exercises.

### #1 - Depositing Fiat

In order to buy cryptocurrencies we should deposit fiat to our wallet. The fiat we are using in this project is dollar.
We can see our current balance in the top right of the menu. If we click on this balance we will see the fiat detail
page on this page it is possible to deposit the current balance, but doing so will result in a 404 error. We will have
to implement this API call in our serverless project.

#### Step 1 - Add an API gateway endpoint to our `serverless.yml`

We should add an endpoint to our serverless project. This endpoint should allow for the following:

* Should be `/api/fiat/deposit` PUT endpoint
    * Tip: Look at the getCoins function to figure out how to create a new endpoint.
* Will accept a body of `{"amount": number }`
    * Tip: Log the event given to the handler to figure out how to read the given body.
* Amount should be bigger than 0 and be less than 100
    * Tip: Add validation in the handler function
* Should return the new balance `{"balance": number }`

#### Finished

We should now have an endpoint which we can call in our frontend. which validates the amount given in the body of the
request.

#### Step 2 - Save fiat in wallet

Our locally run DynamoDb instance acts like a wallet. We should save the deposited fiat inside this wallet to use for
buying crypto. To do this we should connect to our local DynamoDb instance. You can connect with your locally run
instance by using the `getWalletClient` util function.

Use the examples below in your endpoint handler to first read the current wallet balance and add fiat to the wallet.

```typescript
const {DYNAMO_TABLE = '', UNIQUE_ID = ''} = process.env;
const walletClient = getWalletClient();

const result = await walletClient
    .get({
        TableName: DYNAMO_TABLE,
        Key: {
            pk: UNIQUE_ID,
        },
    })
    .promise();

const wallet = result.Item;
```

This example will connect to the database and read the wallet. We want to store a new fiat amount in the database. For
this we would have to use the `.update` method.

```typescript
const addAmount = 100;
const walletAmount = wallet?.fiat || 0;
const newAmount: number = walletAmount + addAmount;

await walletClient
    .update({
        TableName: DYNAMO_TABLE,
        Key: {
            pk: UNIQUE_ID,
        },
        UpdateExpression: 'SET fiat = :amount',
        ExpressionAttributeValues: {
            ':amount': newAmount,
        },
    })
    .promise();
```

In this snippet of code we first define which wallet we want to change using the `pk` attribute. We tell
the `UpdateExpression` to add the amount (in this example 100) to the fiat property on the DynamoDb record. This will
add 100 fiat to our wallet.

If we now check `http://localhost:8001/tables/wallet` fiat should have been added to our wallet!

#### Step 3 - Validate using CryptoService

Be aware that the fiat is only usable for buying cryptocurrency once we have validated it using the `CryptoService`. We
should remove all previous deposited fiat inside our wallet (DynamoDb instance), because this was not validated by
the `CryptoService`.

We do this by going to `http://localhost:8001/tables/wallet` hitting the wallet record and changing the current fiat
to `0` and hitting save.

To validate the purchase of fiat we should call the already defined `depositBalance` method in the `CryptoService` using the amount given in the request body, when accepted we store the amount of fiat inside our wallet.

#### Finished

We can now add fiat to our wallet in order to buy cryptocurrency, but the frontend does not show our fiat yet.

### #2 - Reading Fiat

Now that we are able to add fiat to our wallet we should show it in our frontend. You will notice the amount of fiat is
shown in the top right corner. It is still showing 0,00. We should add an endpoint which the frontend uses to display
this value.

#### Step 1 - Add an API gateway endpoint to our `serverless.yml`

We should add an endpoint to our serverless project. This endpoint should allow for the following:

* Should be `/api/fiat` GET endpoint
* Should return the balance `{"balance": number }`

#### Step 2 - Read fiat balance from your wallet

Now try to read the current balance in your wallet using the `walletClient` and return its value.

#### Finished

When implemented correctly the balance in the frontend should be updated with your current balance.

### #3 - Buy coins

The `Home` page contains all available coins, with the option to buy each of those coins. When the buy option is chosen,
the amount of the coin you want to buy can be selected. When you confirm your purchase, you will notice that another 404
error occurs. In this task, you will buy coins. It's important to know that once you buy a coin, it is necessary to save
it in your wallet. Otherwise, it will be lost.

* Add a new API PUT endpoint `/api/portfolio/buy` to the serverless project
* Create a handler for this endpoint, that will use the `CryptoService` to `buy` your coins.
* Save your purchased coin in your wallet. It is up to you to decide a data structure for your coins. 
* Update the fiat in your wallet.
* Return the result of the buy method as a response of the endpoint

### #4 - Reading wallet coins (Portfolio)

To access your portfolio, we need an API endpoint that retrieves the coins from our local wallet. Use your experience from 
previous exercises to create this endpoint. The endpoint needs the following requirements:

- The endpoint should be `/api/portfolio`
- It should be a GET request
- It should return an array of coin objects from your wallet. A coin object should have an `id` and an `amount`.

Example of a coin:

```
{
    id: "AVA",
    amount: 1337
}
```

### #5 - Sell coins

Selling coins can be done by pressing the sell button next to a coin on the portfolio page. An API request will be
executed towards an endpoint in your local API. Your task is to create the endpoint using Serverless and AWS Lambda.
Make sure to update your wallet when the sell was executed successfully! Otherwise, your local wallet will be out of
sync with the exchange.

* Add a new API PUT endpoint `/api/portfolio/sell` to the serverless project
* Create a handler for this endpoint, that will use the CryptoService to sell your coins.
* Update your wallet with the information you got as a response
* Return the result of the sell method as a response of the endpoint 
