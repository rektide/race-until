/**
* Unfold a promise into something which will always resolve, either with `value` or `error`.
* Additionall attach an optional `index` field with the index number of this item in a collection, as per with the contract for `Array.prototype.map`
*/
export async function mapper( promise, index){
	try{
		var value= await promise
		return {
			value,
			index,
			resolved: true
		}
	}catch( error){
		return {
			error,
			index,
			rejected: true
		}
	}
}

/**
* `NoMatchError` can be used to detect when promiseRacePredicated completes with no matches
*/
export class NoMatchError extends Error{
	constructor( promises){
		super()
		this.promises= promises
	}
}

/**
* Run a promise-race on `promises` until a condition `predicate` returns a truthy value
*/
export async function promiseRacePredicated( promises, predicate, fullResult){
	// allow promises collection to itself by a promise. SOP to accept async values in async functions!
	promises= await promises
	// we will be modifying this so clone it
	promises= promises.slice( 0)
	while( promises.length){
		// to determine winner, I borrow a trick from https://www.jcore.com/2016/12/18/promise-me-you-wont-use-promise-race/ -
		// map promise success & failure to a value that includes the index
		var candidates= promises.map( mapper)

		// get candidate- with either a `value` or `error`- and it's index
		var candidate= await Promise.race( candidates)
		// perform our test to see whether we're going to accept this candidate
		if( await predicate( candidate.value, candidate.error, candidate.index, promises)){
			// we have accepted the candidate. figure out how to return it:
			if( fullResult){
				// this special mode returns the internal payload, which is useful if
				// a consumer wants to know index number (or doesn't want the "throw" mode of an error)
				candidate.promises= promises
				return candidate
			}
			if( candidate.resolved){
				// resolve, like this candidate did
				return candidate.value
			}
			// this candidate had an error. throw that error.
			throw candidate.error
		}
		// discard this non-match and iterate
		promises.splice( candidate.index, 1)
	}
	var error= new NoMatchError()
	if( fullResult){
		// be consistent & return rather than throw an appropriate iterant
		return {
			error
		}
	}
	throw error
}
export default promiseRacePredicated
