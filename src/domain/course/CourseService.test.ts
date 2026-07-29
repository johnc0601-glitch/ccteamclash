import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {CourseService} from '@/domain/course/CourseService';
import assert from 'node:assert/strict';
import test from 'node:test';

test('CourseService creates, searches, archives, and restores courses', async () => {
  const service = new CourseService(new MockCourseRepository());
  const created = await service.create({
    name: 'Test Course',
    city: 'Wilmington',
    state: 'nc',
    address: '100 Test Lane',
    mapUrl: 'https://maps.google.com/?q=test',
    udiscUrl: '',
    photoUrl: '',
    description: '',
  });

  assert.equal(created.ok, true);
  const matches = await service.getAll({search: 'test lane'});
  assert.equal(matches.length, 1);
  assert.equal(matches[0].state, 'NC');

  const archived = await service.archive(matches[0].id);
  assert.equal(archived.ok, true);
  assert.equal((await service.getAll({status: 'archived'})).length, 1);

  const restored = await service.restore(matches[0].id);
  assert.equal(restored.ok, true);
});

test('CourseService validates map links and duplicate courses', async () => {
  const service = new CourseService(new MockCourseRepository());
  const invalid = await service.create({
    name: 'New Course',
    city: 'Wilmington',
    state: 'NC',
    address: '',
    mapUrl: 'not-a-link',
    udiscUrl: '',
    photoUrl: '',
    description: '',
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.fieldErrors?.mapUrl, 'Enter a valid web link.');

  const duplicate = await service.create({
    name: 'Arrowhead Park',
    city: 'Wilmington',
    state: 'NC',
    address: '',
    mapUrl: 'https://maps.google.com/?q=arrowhead',
    udiscUrl: '',
    photoUrl: '',
    description: '',
  });
  assert.equal(duplicate.ok, false);
});
