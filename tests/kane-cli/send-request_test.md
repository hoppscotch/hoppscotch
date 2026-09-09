# Hoppscotch — Send a request and verify the response

A Kane CLI natural-language end-to-end test for the core Hoppscotch flow:
composing a request, sending it, and reading the response. Runs in a real
browser; Kane CLI also automates mobile apps on the iOS Simulator and Android
Emulator.

## Send a GET request and assert the response
Go to https://hoppscotch.io.
In the request URL bar, set the method to GET and enter the URL https://jsonplaceholder.typicode.com/todos/1.
Click the Send button.
Wait for the response to load.
Assert that the response status is 200.
Assert that the response body contains the text "delectus aut autem".

<!--
Run it:
  kane-cli testmd run tests/kane-cli/send-request_test.md --agent
Evidence (this run): see PR description.
-->
