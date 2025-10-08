# supermemory · PyPI

**Source:** https://supermemory.ai/docs/memory-api/sdks/supermemory-pypi
**Scraped:** 2025-10-08 18:01:31

---

# supermemory 3.3.0

pip install supermemory __ Copy PIP instructions

[ Latest version ](/project/supermemory/)

Released:  Sep 21, 2025 

The official Python library for the supermemory API

### Navigation

###  Verified details __

_These details have been[verified by PyPI](https://docs.pypi.org/project_metadata/#verified-details)_

###### Maintainers

[ dhravya ](/user/dhravya/)

### Unverified details

_These details have**not** been verified by PyPI_

###### Project links

  * [ __Homepage](https://github.com/supermemoryai/python-sdk)
  * [ __Repository](https://github.com/supermemoryai/python-sdk)



###### Meta

  * **License:** Apache Software License (Apache-2.0) 
  * **Author:** [Supermemory](mailto:dhravya@supermemory.com)
  * **Requires:** Python >=3.8 
  * **Provides-Extra:** `aiohttp`



###### Classifiers

  * **Intended Audience**
    * [ Developers ](/search/?c=Intended+Audience+%3A%3A+Developers)
  * **License**
    * [ OSI Approved :: Apache Software License ](/search/?c=License+%3A%3A+OSI+Approved+%3A%3A+Apache+Software+License)
  * **Operating System**
    * [ MacOS ](/search/?c=Operating+System+%3A%3A+MacOS)
    * [ Microsoft :: Windows ](/search/?c=Operating+System+%3A%3A+Microsoft+%3A%3A+Windows)
    * [ OS Independent ](/search/?c=Operating+System+%3A%3A+OS+Independent)
    * [ POSIX ](/search/?c=Operating+System+%3A%3A+POSIX)
    * [ POSIX :: Linux ](/search/?c=Operating+System+%3A%3A+POSIX+%3A%3A+Linux)
  * **Programming Language**
    * [ Python :: 3.8 ](/search/?c=Programming+Language+%3A%3A+Python+%3A%3A+3.8)
    * [ Python :: 3.9 ](/search/?c=Programming+Language+%3A%3A+Python+%3A%3A+3.9)
    * [ Python :: 3.10 ](/search/?c=Programming+Language+%3A%3A+Python+%3A%3A+3.10)
    * [ Python :: 3.11 ](/search/?c=Programming+Language+%3A%3A+Python+%3A%3A+3.11)
    * [ Python :: 3.12 ](/search/?c=Programming+Language+%3A%3A+Python+%3A%3A+3.12)
    * [ Python :: 3.13 ](/search/?c=Programming+Language+%3A%3A+Python+%3A%3A+3.13)
  * **Topic**
    * [ Software Development :: Libraries :: Python Modules ](/search/?c=Topic+%3A%3A+Software+Development+%3A%3A+Libraries+%3A%3A+Python+Modules)
  * **Typing**
    * [ Typed ](/search/?c=Typing+%3A%3A+Typed)



[Report project as malware](https://pypi.org/project/supermemory/submit-malware-report/)

## Project description

# Supermemory Python API library

[](https://pypi.org/project/supermemory/)

The Supermemory Python library provides convenient access to the Supermemory REST API from any Python 3.8+ application. The library includes type definitions for all request params and response fields, and offers both synchronous and asynchronous clients powered by [httpx](https://github.com/encode/httpx).

It is generated with [Stainless](https://www.stainless.com/).

## Documentation

The REST API documentation can be found on [docs.supermemory.ai](https://docs.supermemory.ai). The full API of this library can be found in [api.md](https://github.com/supermemoryai/python-sdk/tree/main/api.md).

## Installation
    
    
    # install from PyPI
    pip install supermemory
    

## Usage

The full API of this library can be found in [api.md](https://github.com/supermemoryai/python-sdk/tree/main/api.md).
    
    
    import os
    from supermemory import Supermemory
    
    client = Supermemory(
        api_key=os.environ.get("SUPERMEMORY_API_KEY"),  # This is the default and can be omitted
    )
    
    response = client.search.documents(
        q="documents related to python",
    )
    print(response.results)
    

While you can provide an `api_key` keyword argument, we recommend using [python-dotenv](https://pypi.org/project/python-dotenv/) to add `SUPERMEMORY_API_KEY="My API Key"` to your `.env` file so that your API Key is not stored in source control.

## Async usage

Simply import `AsyncSupermemory` instead of `Supermemory` and use `await` with each API call:
    
    
    import os
    import asyncio
    from supermemory import AsyncSupermemory
    
    client = AsyncSupermemory(
        api_key=os.environ.get("SUPERMEMORY_API_KEY"),  # This is the default and can be omitted
    )
    
    
    async def main() -> None:
        response = await client.search.documents(
            q="documents related to python",
        )
        print(response.results)
    
    
    asyncio.run(main())
    

Functionality between the synchronous and asynchronous clients is otherwise identical.

### With aiohttp

By default, the async client uses `httpx` for HTTP requests. However, for improved concurrency performance you may also use `aiohttp` as the HTTP backend.

You can enable this by installing `aiohttp`:
    
    
    # install from PyPI
    pip install supermemory[aiohttp]
    

Then you can enable it by instantiating the client with `http_client=DefaultAioHttpClient()`:
    
    
    import asyncio
    from supermemory import DefaultAioHttpClient
    from supermemory import AsyncSupermemory
    
    
    async def main() -> None:
        async with AsyncSupermemory(
            api_key="My API Key",
            http_client=DefaultAioHttpClient(),
        ) as client:
            response = await client.search.documents(
                q="documents related to python",
            )
            print(response.results)
    
    
    asyncio.run(main())
    

## Using types

Nested request parameters are [TypedDicts](https://docs.python.org/3/library/typing.html#typing.TypedDict). Responses are [Pydantic models](https://docs.pydantic.dev) which also provide helper methods for things like:

  * Serializing back into JSON, `model.to_json()`
  * Converting to a dictionary, `model.to_dict()`



Typed requests and responses provide autocomplete and documentation within your editor. If you would like to see type errors in VS Code to help catch bugs earlier, set `python.analysis.typeCheckingMode` to `basic`.

## Nested params

Nested parameters are dictionaries, typed using `TypedDict`, for example:
    
    
    from supermemory import Supermemory
    
    client = Supermemory()
    
    response = client.search.memories(
        q="machine learning concepts",
        include={},
    )
    print(response.include)
    

## File uploads

Request parameters that correspond to file uploads can be passed as `bytes`, or a [`PathLike`](https://docs.python.org/3/library/os.html#os.PathLike) instance or a tuple of `(filename, contents, media type)`.
    
    
    from pathlib import Path
    from supermemory import Supermemory
    
    client = Supermemory()
    
    client.memories.upload_file(
        file=Path("/path/to/file"),
    )
    

The async client uses the exact same interface. If you pass a [`PathLike`](https://docs.python.org/3/library/os.html#os.PathLike) instance, the file contents will be read asynchronously automatically.

## Handling errors

When the library is unable to connect to the API (for example, due to network connection problems or a timeout), a subclass of `supermemory.APIConnectionError` is raised.

When the API returns a non-success status code (that is, 4xx or 5xx response), a subclass of `supermemory.APIStatusError` is raised, containing `status_code` and `response` properties.

All errors inherit from `supermemory.APIError`.
    
    
    import supermemory
    from supermemory import Supermemory
    
    client = Supermemory()
    
    try:
        client.memories.add(
            content="This is a detailed article about machine learning concepts...",
        )
    except supermemory.APIConnectionError as e:
        print("The server could not be reached")
        print(e.__cause__)  # an underlying Exception, likely raised within httpx.
    except supermemory.RateLimitError as e:
        print("A 429 status code was received; we should back off a bit.")
    except supermemory.APIStatusError as e:
        print("Another non-200-range status code was received")
        print(e.status_code)
        print(e.response)
    

Error codes are as follows:

Status Code | Error Type  
---|---  
400 | `BadRequestError`  
401 | `AuthenticationError`  
403 | `PermissionDeniedError`  
404 | `NotFoundError`  
422 | `UnprocessableEntityError`  
429 | `RateLimitError`  
>=500 | `InternalServerError`  
N/A | `APIConnectionError`  
  
### Retries

Certain errors are automatically retried 2 times by default, with a short exponential backoff. Connection errors (for example, due to a network connectivity problem), 408 Request Timeout, 409 Conflict, 429 Rate Limit, and >=500 Internal errors are all retried by default.

You can use the `max_retries` option to configure or disable retry settings:
    
    
    from supermemory import Supermemory
    
    # Configure the default for all requests:
    client = Supermemory(
        # default is 2
        max_retries=0,
    )
    
    # Or, configure per-request:
    client.with_options(max_retries=5).memories.add(
        content="This is a detailed article about machine learning concepts...",
    )
    

### Timeouts

By default requests time out after 1 minute. You can configure this with a `timeout` option, which accepts a float or an [`httpx.Timeout`](https://www.python-httpx.org/advanced/timeouts/#fine-tuning-the-configuration) object:
    
    
    from supermemory import Supermemory
    
    # Configure the default for all requests:
    client = Supermemory(
        # 20 seconds (default is 1 minute)
        timeout=20.0,
    )
    
    # More granular control:
    client = Supermemory(
        timeout=httpx.Timeout(60.0, read=5.0, write=10.0, connect=2.0),
    )
    
    # Override per-request:
    client.with_options(timeout=5.0).memories.add(
        content="This is a detailed article about machine learning concepts...",
    )
    

On timeout, an `APITimeoutError` is thrown.

Note that requests that time out are [retried twice by default](https://github.com/supermemoryai/python-sdk/tree/main/#retries).

## Advanced

### Logging

We use the standard library [`logging`](https://docs.python.org/3/library/logging.html) module.

You can enable logging by setting the environment variable `SUPERMEMORY_LOG` to `info`.
    
    
    $ export SUPERMEMORY_LOG=info
    

Or to `debug` for more verbose logging.

### How to tell whether `None` means `null` or missing

In an API response, a field may be explicitly `null`, or missing entirely; in either case, its value is `None` in this library. You can differentiate the two cases with `.model_fields_set`:
    
    
    if response.my_field is None:
      if 'my_field' not in response.model_fields_set:
        print('Got json like {}, without a "my_field" key present at all.')
      else:
        print('Got json like {"my_field": null}.')
    

### Accessing raw response data (e.g. headers)

The "raw" Response object can be accessed by prefixing `.with_raw_response.` to any HTTP method call, e.g.,
    
    
    from supermemory import Supermemory
    
    client = Supermemory()
    response = client.memories.with_raw_response.add(
        content="This is a detailed article about machine learning concepts...",
    )
    print(response.headers.get('X-My-Header'))
    
    memory = response.parse()  # get the object that `memories.add()` would have returned
    print(memory.id)
    

These methods return an [`APIResponse`](https://github.com/supermemoryai/python-sdk/tree/main/src/supermemory/_response.py) object.

The async client returns an [`AsyncAPIResponse`](https://github.com/supermemoryai/python-sdk/tree/main/src/supermemory/_response.py) with the same structure, the only difference being `await`able methods for reading the response content.

#### `.with_streaming_response`

The above interface eagerly reads the full response body when you make the request, which may not always be what you want.

To stream the response body, use `.with_streaming_response` instead, which requires a context manager and only reads the response body once you call `.read()`, `.text()`, `.json()`, `.iter_bytes()`, `.iter_text()`, `.iter_lines()` or `.parse()`. In the async client, these are async methods.
    
    
    with client.memories.with_streaming_response.add(
        content="This is a detailed article about machine learning concepts...",
    ) as response:
        print(response.headers.get("X-My-Header"))
    
        for line in response.iter_lines():
            print(line)
    

The context manager is required so that the response will reliably be closed.

### Making custom/undocumented requests

This library is typed for convenient access to the documented API.

If you need to access undocumented endpoints, params, or response properties, the library can still be used.

#### Undocumented endpoints

To make requests to undocumented endpoints, you can make requests using `client.get`, `client.post`, and other http verbs. Options on the client will be respected (such as retries) when making this request.
    
    
    import httpx
    
    response = client.post(
        "/foo",
        cast_to=httpx.Response,
        body={"my_param": True},
    )
    
    print(response.headers.get("x-foo"))
    

#### Undocumented request params

If you want to explicitly send an extra param, you can do so with the `extra_query`, `extra_body`, and `extra_headers` request options.

#### Undocumented response properties

To access undocumented response properties, you can access the extra fields like `response.unknown_prop`. You can also get all the extra fields on the Pydantic model as a dict with [`response.model_extra`](https://docs.pydantic.dev/latest/api/base_model/#pydantic.BaseModel.model_extra).

### Configuring the HTTP client

You can directly override the [httpx client](https://www.python-httpx.org/api/#client) to customize it for your use case, including:

  * Support for [proxies](https://www.python-httpx.org/advanced/proxies/)
  * Custom [transports](https://www.python-httpx.org/advanced/transports/)
  * Additional [advanced](https://www.python-httpx.org/advanced/clients/) functionality


    
    
    import httpx
    from supermemory import Supermemory, DefaultHttpxClient
    
    client = Supermemory(
        # Or use the `SUPERMEMORY_BASE_URL` env var
        base_url="http://my.test.server.example.com:8083",
        http_client=DefaultHttpxClient(
            proxy="http://my.test.proxy.example.com",
            transport=httpx.HTTPTransport(local_address="0.0.0.0"),
        ),
    )
    

You can also customize the client on a per-request basis by using `with_options()`:
    
    
    client.with_options(http_client=DefaultHttpxClient(...))
    

### Managing HTTP resources

By default the library closes underlying HTTP connections whenever the client is [garbage collected](https://docs.python.org/3/reference/datamodel.html#object.__del__). You can manually close the client using the `.close()` method if desired, or with a context manager that closes when exiting.
    
    
    from supermemory import Supermemory
    
    with Supermemory() as client:
      # make requests here
      ...
    
    # HTTP client is now closed
    

## Versioning

This package generally follows [SemVer](https://semver.org/spec/v2.0.0.html) conventions, though certain backwards-incompatible changes may be released as minor versions:

  1. Changes that only affect static types, without breaking runtime behavior.
  2. Changes to library internals which are technically public but not intended or documented for external use. _(Please open a GitHub issue to let us know if you are relying on such internals.)_
  3. Changes that we do not expect to impact the vast majority of users in practice.



We take backwards-compatibility seriously and work hard to ensure you can rely on a smooth upgrade experience.

We are keen for your feedback; please open an [issue](https://www.github.com/supermemoryai/python-sdk/issues) with questions, bugs, or suggestions.

### Determining the installed version

If you've upgraded to the latest version but aren't seeing any new features you were expecting then your python environment is likely still using an older version.

You can determine the version that is being used at runtime with:
    
    
    import supermemory
    print(supermemory.__version__)
    

## Requirements

Python 3.8 or higher.

## Contributing

See [the contributing documentation](https://github.com/supermemoryai/python-sdk/tree/main/./CONTRIBUTING.md).

## Project details

###  Verified details __

_These details have been[verified by PyPI](https://docs.pypi.org/project_metadata/#verified-details)_

###### Maintainers

[ dhravya ](/user/dhravya/)

### Unverified details

_These details have**not** been verified by PyPI_

###### Project links

  * [ __Homepage](https://github.com/supermemoryai/python-sdk)
  * [ __Repository](https://github.com/supermemoryai/python-sdk)



###### Meta

  * **License:** Apache Software License (Apache-2.0) 
  * **Author:** [Supermemory](mailto:dhravya@supermemory.com)
  * **Requires:** Python >=3.8 
  * **Provides-Extra:** `aiohttp`



###### Classifiers

  * **Intended Audience**
    * [ Developers ](/search/?c=Intended+Audience+%3A%3A+Developers)
  * **License**
    * [ OSI Approved :: Apache Software License ](/search/?c=License+%3A%3A+OSI+Approved+%3A%3A+Apache+Software+License)
  * **Operating System**
    * [ MacOS ](/search/?c=Operating+System+%3A%3A+MacOS)
    * [ Microsoft :: Windows ](/search/?c=Operating+System+%3A%3A+Microsoft+%3A%3A+Windows)
    * [ OS Independent ](/search/?c=Operating+System+%3A%3A+OS+Independent)
    * [ POSIX ](/search/?c=Operating+System+%3A%3A+POSIX)
    * [ POSIX :: Linux ](/search/?c=Operating+System+%3A%3A+POSIX+%3A%3A+Linux)
  * **Programming Language**
    * [ Python :: 3.8 ](/search/?c=Programming+Language+%3A%3A+Python+%3A%3A+3.8)
    * [ Python :: 3.9 ](/search/?c=Programming+Language+%3A%3A+Python+%3A%3A+3.9)
    * [ Python :: 3.10 ](/search/?c=Programming+Language+%3A%3A+Python+%3A%3A+3.10)
    * [ Python :: 3.11 ](/search/?c=Programming+Language+%3A%3A+Python+%3A%3A+3.11)
    * [ Python :: 3.12 ](/search/?c=Programming+Language+%3A%3A+Python+%3A%3A+3.12)
    * [ Python :: 3.13 ](/search/?c=Programming+Language+%3A%3A+Python+%3A%3A+3.13)
  * **Topic**
    * [ Software Development :: Libraries :: Python Modules ](/search/?c=Topic+%3A%3A+Software+Development+%3A%3A+Libraries+%3A%3A+Python+Modules)
  * **Typing**
    * [ Typed ](/search/?c=Typing+%3A%3A+Typed)



  


##  Release history [Release notifications](/help/#project-release-notifications) | [RSS feed __](/rss/project/supermemory/releases.xml)

This version

[ 3.3.0  Sep 21, 2025  ](/project/supermemory/3.3.0/)

[ 3.2.0  Sep 21, 2025  ](/project/supermemory/3.2.0/)

[ 3.1.0  Sep 20, 2025  ](/project/supermemory/3.1.0/)

[ 3.0.0a30 pre-release Sep 16, 2025  ](/project/supermemory/3.0.0a30/)

[ 3.0.0a29 pre-release Aug 27, 2025  ](/project/supermemory/3.0.0a29/)

[ 3.0.0a28 pre-release Aug 24, 2025  ](/project/supermemory/3.0.0a28/)

[ 3.0.0a27 pre-release Aug 24, 2025  ](/project/supermemory/3.0.0a27/)

[ 3.0.0a26 pre-release Aug 15, 2025  ](/project/supermemory/3.0.0a26/)

[ 3.0.0a25 pre-release Aug 15, 2025  ](/project/supermemory/3.0.0a25/)

[ 3.0.0a24 pre-release Aug 11, 2025  ](/project/supermemory/3.0.0a24/)

[ 3.0.0a23 pre-release Jul 15, 2025  ](/project/supermemory/3.0.0a23/)

[ 3.0.0a22 pre-release Jul 3, 2025  ](/project/supermemory/3.0.0a22/)

[ 3.0.0a21 pre-release Jul 3, 2025  ](/project/supermemory/3.0.0a21/)

[ 3.0.0a20 pre-release Jun 28, 2025  ](/project/supermemory/3.0.0a20/)

[ 3.0.0a19 pre-release Jun 26, 2025  ](/project/supermemory/3.0.0a19/)

[ 3.0.0a2 pre-release Jun 26, 2025  ](/project/supermemory/3.0.0a2/)

[ 3.0.0a1 pre-release May 17, 2025  ](/project/supermemory/3.0.0a1/)

[ 0.1.0a1 pre-release Apr 29, 2025  ](/project/supermemory/0.1.0a1/)

## Download files

Download the file for your platform. If you're not sure which to choose, learn more about [installing packages](https://packaging.python.org/tutorials/installing-packages/ "External link"). 

###  Source Distribution 

__

[supermemory-3.3.0.tar.gz](https://files.pythonhosted.org/packages/33/0f/16344a67c96fc096322b762b99b54474501643b678b0fdfb234462f95989/supermemory-3.3.0.tar.gz) (119.7 kB view details) 

Uploaded  Sep 21, 2025  `Source`

###  Built Distribution 

Filter files by name, interpreter, ABI, and platform. 

If you're not sure about the file name format, learn more about [wheel file names](https://packaging.python.org/en/latest/specifications/binary-distribution-format/ "External link"). 

The dropdown lists show the available interpreters, ABIs, and platforms. 

Enable javascript to be able to filter the list of wheel files. 

Copy a direct link to the current filters [](https://pypi.org/project/supermemory/#files) Copy 

File name

Interpreter Interpreter py3

ABI ABI none

Platform Platform any

__

[supermemory-3.3.0-py3-none-any.whl](https://files.pythonhosted.org/packages/48/2d/2dcaccee048479b5beeb89e15b6ab99fa449908acda8df72e8e1ed5b968a/supermemory-3.3.0-py3-none-any.whl) (119.1 kB view details) 

Uploaded  Sep 21, 2025  `Python 3`

## File details

Details for the file `supermemory-3.3.0.tar.gz`. 

### File metadata

  * Download URL: [supermemory-3.3.0.tar.gz](https://files.pythonhosted.org/packages/33/0f/16344a67c96fc096322b762b99b54474501643b678b0fdfb234462f95989/supermemory-3.3.0.tar.gz)
  * Upload date:  Sep 21, 2025 
  * Size: 119.7 kB 
  * Tags: Source
  * Uploaded using Trusted Publishing? No 
  * Uploaded via: twine/5.1.1 CPython/3.12.9



### File hashes

Hashes for supermemory-3.3.0.tar.gz Algorithm | Hash digest |   
---|---|---  
SHA256 |  `010a6d9059271bb74e80a058cbb012e60b05ca3dfe1678c728bdea706a08638c` |  Copy   
MD5 |  `131db240502a4632de62d7b67bcbd3fb` |  Copy   
BLAKE2b-256 |  `330f16344a67c96fc096322b762b99b54474501643b678b0fdfb234462f95989` |  Copy   
  
[See more details on using hashes here.](https://pip.pypa.io/en/stable/topics/secure-installs/#hash-checking-mode "External link")

## File details

Details for the file `supermemory-3.3.0-py3-none-any.whl`. 

### File metadata

  * Download URL: [supermemory-3.3.0-py3-none-any.whl](https://files.pythonhosted.org/packages/48/2d/2dcaccee048479b5beeb89e15b6ab99fa449908acda8df72e8e1ed5b968a/supermemory-3.3.0-py3-none-any.whl)
  * Upload date:  Sep 21, 2025 
  * Size: 119.1 kB 
  * Tags: Python 3
  * Uploaded using Trusted Publishing? No 
  * Uploaded via: twine/5.1.1 CPython/3.12.9



### File hashes

Hashes for supermemory-3.3.0-py3-none-any.whl Algorithm | Hash digest |   
---|---|---  
SHA256 |  `d40a530ea3ea311b4570a0f8d2364c9ef1869cce8804c26ce3a40441847295df` |  Copy   
MD5 |  `a0a4eb86271b04cc08a72ad6216ad3d9` |  Copy   
BLAKE2b-256 |  `482d2dcaccee048479b5beeb89e15b6ab99fa449908acda8df72e8e1ed5b968a` |  Copy   
  
[See more details on using hashes here.](https://pip.pypa.io/en/stable/topics/secure-installs/#hash-checking-mode "External link")
